type StyleFn = (input: string) => string;

export const symbols = {
  CHECK_MARK: '\u2714',
  X_MARK: '\u2716',
};

export const bold = styleFactory(1, 22);
export const cyan = styleFactory(36);
export const green = styleFactory(32);
export const red = styleFactory(31);
export const yellow = styleFactory(33);

export const stripIndentation = (input: string): string => {
  const lines = input.replace(/^ *\n/, '').replace(/\n *$/, '').split('\n');
  const minIndentation = Math.min(...lines.
    filter(l => !/^ *$/.test(l)).
    map(l => /^ */.exec(l)![0].length));
  const re = new RegExp(`^ {0,${minIndentation}}`);

  return lines.map(l => l.replace(re, '')).join('\n');
};

// Helpers
function styleFactory(openCode: number, closeCode = 39): StyleFn {
  return input => `\u001b[${openCode}m${input}\u001b[${closeCode}m`;
}
