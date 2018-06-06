export const mockVscode = {
  window: {
    showInformationMessage: noop,
  },
};

// Helpers
function noop(): void {
  return;
}
