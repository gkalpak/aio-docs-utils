import {Range} from 'vscode';
import {getDocregionMatcher} from './docregion-matchers';


export interface DocregionInfo {
  contents: string;
  ranges: Range[];
}

interface ProvisionaryDocregionInfo {
  lines: string[];
  ranges: number[][];
  open: boolean;
}

export class DocregionExtractor {
  private static readonly DEFAULT_PLASTER = '. . .';
  private readonly lines: string[];

  constructor(contents: string) {
    this.lines = contents.split(/\r?\n/);
  }

  public extract(fileType: string, docregion = ''): DocregionInfo {
    const regions = new Map<string, ProvisionaryDocregionInfo>();
    const openRegions: string[] = [];

    // Retrieve an appropriate docregion matcher for the file-type.
    const matcher = getDocregionMatcher(fileType);
    let plaster = matcher.createPlasterComment(DocregionExtractor.DEFAULT_PLASTER);

    // Run through all lines and assign them to docregions.
    const lines = this.lines.filter((line, lineIdx) => {
      const startRegion = matcher.regionStartRe.exec(line);
      const endRegion = !startRegion && matcher.regionEndRe.exec(line);
      const updatePlaster = !endRegion && matcher.plasterRe.exec(line);

      if (startRegion) {
        const names = this.getRegionNames(startRegion[1]);

        if (!names.length) {
          names.push('');
        }

        names.forEach(name => {
          openRegions.push(name);

          if (!regions.has(name)) {
            regions.set(name, {lines: [], ranges: [[lineIdx + 1]], open: true});
          } else {
            const region = regions.get(name)!;
            region.open = true;
            region.ranges.push([lineIdx + 1]);
            if (plaster) {
              region.lines.push(plaster);
            }
          }
        });
      } else if (endRegion) {
        const names = this.getRegionNames(endRegion[1]);

        if (!names.length) {
          names.push(openRegions[openRegions.length - 1]);
        }

        names.forEach(name => {
          const region = regions.get(name)!;
          region.open = false;
          region.ranges[region.ranges.length - 1].push(lineIdx);
          this.removeLast(openRegions, name);
        });
      } else if (updatePlaster) {
        const plasterText = updatePlaster[1].trim();
        plaster = plasterText && matcher.createPlasterComment(plasterText);
      } else {
        openRegions.forEach(name => regions.get(name)!.lines.push(line));
        return true;
      }

      return false;
    });

    // All open docregions are implicitly closed at the EOF.
    openRegions.forEach(name => {
      const region = regions.get(name)!;
      region.open = false;
      region.ranges[region.ranges.length - 1].push(this.lines.length);
    });

    // If there is no explicit "default" docregion (i.e. `''`),
    // then all lines (except for docregion markers) belong to the default docregion.
    if (!regions.has('')) {
      regions.set('', {lines, ranges: [[0, 0]], open: false});
    }

    // Retrieve the specified region, post-process, and return it.
    const region = regions.get(docregion)!;
    const contents = this.leftAlign(region.lines).join('\n');
    const ranges = region.ranges.map(([fromLineIdx, toLineIdx]) =>
      new Range(fromLineIdx, 0, toLineIdx, 0));

    return {contents, ranges};
  }

  private getRegionNames(input: string): string[] {
    input = input.trim();
    return !input ? [] : input.split(',').map(name => name.trim());
  }

  private leftAlign(lines: string[]): string[] {
    let indent = Infinity;

    lines.forEach(line => {
      const lineIndent = line.search(/\S/);
      if (lineIndent !== -1) {
        indent = Math.min(indent, lineIndent);
      }
    });

    return lines.map(line => line.slice(indent));
  }

  private removeLast<T = any>(items: T[], item: T): void {
    const idx = items.lastIndexOf(item);
    items.splice(idx, 1);
  }
}
