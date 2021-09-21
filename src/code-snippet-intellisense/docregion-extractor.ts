import {Range} from 'vscode';
import {LruCache} from '../shared/lru-cache';
import {hash} from '../shared/utils';
import {getDocregionMatcher} from './docregion-matchers';


export interface IDocregionInfo {
  fileType: string;
  contents: string[];
  ranges: Range[];
}

export interface IProvisionalDocregionInfo {
  rawContents: string[];
  rawRanges: number[][];
}

export class DocregionExtractor {
  public static for(fileType: string, contents: string): DocregionExtractor {
    const cache = DocregionExtractor.cache;
    const sha = hash(`${fileType}|${contents}`);

    if (!cache.has(sha)) {
      cache.set(sha, new DocregionExtractor(fileType, contents));
    }

    return cache.get(sha)!;
  }

  private static readonly DEFAULT_PLASTER = '. . .';
  private static readonly cache = new LruCache<string, DocregionExtractor>();
  private regions: Map<string, IProvisionalDocregionInfo | IDocregionInfo> | null = null;

  constructor(private readonly fileType: string, private contents: string) {
  }

  public extract(docregion?: ''): IDocregionInfo;
  public extract(docregion: string): IDocregionInfo | null;
  public extract(docregion: string = ''): IDocregionInfo | null {
    // Retrieve the specified region, post-process (if not already post-processed), and return it.
    const regions = this.getRegions();
    let regionInfo = regions.get(docregion);

    if (!regionInfo) {
      return null;
    }

    if (this.isProvisional(regionInfo)) {
      const contents = this.leftAlign(regionInfo.rawContents);
      const ranges = regionInfo.rawRanges.map(([fromLineIdx, toLineIdx]) =>
        new Range(fromLineIdx, 0, toLineIdx, 0));

      regionInfo = {fileType: this.fileType, contents, ranges};
      regions.set(docregion, regionInfo);
    }

    return regionInfo;
  }

  public getAvailableNames(): string[] {
    const regions = this.getRegions();
    return Array.from(regions.keys());
  }

  protected getRegions(): Map<string, IProvisionalDocregionInfo | IDocregionInfo> {
    if (!this.regions) {
      this.regions = this.extractProvisional(this.fileType, this.contents);
      this.contents = '';
    }

    return this.regions;
  }

  private extractProvisional(fileType: string, contents: string): Map<string, IProvisionalDocregionInfo> {
    const rawLines = contents.split(/\r?\n/);
    const regions = new Map<string, IProvisionalDocregionInfo>();
    const openRegions: string[] = [];

    // Retrieve an appropriate docregion matcher for the file-type.
    const matcher = getDocregionMatcher(fileType);
    let plaster = matcher.createPlasterComment(DocregionExtractor.DEFAULT_PLASTER);

    // Run through all lines and assign them to docregions.
    const lines = rawLines.filter((line, lineIdx) => {
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
          const newRange = [lineIdx + 1];

          if (!regions.has(name)) {
            regions.set(name, {rawContents: [], rawRanges: [newRange]});
          } else {
            const region = regions.get(name)!;
            region.rawRanges.push(newRange);
            if (plaster) {
              const indent = startRegion[0].split(/\S/, 1)[0];
              region.rawContents.push(indent + plaster);
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
          region.rawRanges[region.rawRanges.length - 1].push(lineIdx);
          this.removeLast(openRegions, name);
        });
      } else if (updatePlaster) {
        const plasterText = updatePlaster[1].trim();
        plaster = plasterText && matcher.createPlasterComment(plasterText);
      } else {
        openRegions.forEach(name => regions.get(name)!.rawContents.push(line));
        return true;
      }

      return false;
    });

    // All open docregions are implicitly closed at the EOF.
    openRegions.forEach(name => {
      const region = regions.get(name)!;
      region.rawRanges[region.rawRanges.length - 1].push(rawLines.length);
    });

    // If there is no explicit "default" docregion (i.e. `''`),
    // then all lines (except for docregion markers) belong to the default docregion.
    if (!regions.has('')) {
      regions.set('', {rawContents: lines, rawRanges: [[0, 0]]});
    }

    return regions;
  }

  private getRegionNames(input: string): string[] {
    input = input.trim();
    return !input ? [] : input.split(',').map(name => name.trim());
  }

  private isProvisional(info: IProvisionalDocregionInfo | IDocregionInfo): info is IProvisionalDocregionInfo {
    return info.hasOwnProperty('rawContents');
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
