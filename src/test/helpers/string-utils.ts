type StyleFn = (input: string) => string;

export const bold = styleFactory(1, 22);
export const cyan = styleFactory(36);
export const green = styleFactory(32);
export const red = styleFactory(31);
export const symbols = {
  CHECK_MARK: '\u2714',
  X_MARK: '\u2716',
};

// Helpers
function styleFactory(openCode: number, closeCode = 39): StyleFn {
  return input => `\u001b[${openCode}m${input}\u001b[${closeCode}m`;
}
