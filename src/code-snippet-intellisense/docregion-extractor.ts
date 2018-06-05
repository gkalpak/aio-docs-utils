import {Range} from 'vscode';


export interface DocregionInfo {
  contents: string;
  ranges: Range[];
}

interface RegionInfo {
  lines: string[];
  ranges: number[][];
  open: boolean;
}

interface RegionMatcher {
  regionStartRe: RegExp;
  regionEndRe: RegExp;
  plasterRe: RegExp;

  createPlasterComment(plaster: string): string;
}

export class DocregionExtractor {
  private static readonly DEFAULT_PLASTER = '. . .';
  private static readonly DEFAULT_REGION_MATCHER: RegionMatcher = {
    regionStartRe: /^\s*\/\/\s*#docregion\s*(.*)$/,
    regionEndRe: /^\s*\/\/\s*#enddocregion\s*(.*)$/,
    plasterRe: /^\s*\/\/\s*#docplaster\s*(.*)$/,
    createPlasterComment: (plaster: string) => `/* ${plaster} */`,
  };

  private readonly lines: string[];

  constructor(contents: string) {
    this.lines = contents.split(/\r?\n/);
  }

  public extract(docregion = '', matcher = DocregionExtractor.DEFAULT_REGION_MATCHER): DocregionInfo {
    const regions = new Map<string, RegionInfo>();
    const openRegions: string[] = [];
    let plaster = matcher.createPlasterComment(DocregionExtractor.DEFAULT_PLASTER);

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

    if (!regions.has('')) {
      regions.set('', {lines, ranges: [[0, 0]], open: false});
    }

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
