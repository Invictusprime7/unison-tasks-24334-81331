import {
  isAllowedPreviewFileContent,
  normalizePreviewFilePath,
} from "../../api/_lib/security";

describe("normalizePreviewFilePath", () => {
  it("normalizes safe relative paths", () => {
    expect(normalizePreviewFilePath("/src/components/App.tsx")).toBe("src/components/App.tsx");
    expect(normalizePreviewFilePath("src\\App.tsx")).toBe("src/App.tsx");
  });

  it("rejects traversal attempts", () => {
    expect(normalizePreviewFilePath("../package.json")).toBeNull();
    expect(normalizePreviewFilePath("src/../../secrets.txt")).toBeNull();
    expect(normalizePreviewFilePath("..\\..\\windows.txt")).toBeNull();
  });

  it("rejects empty and control-character paths", () => {
    expect(normalizePreviewFilePath("")).toBeNull();
    expect(normalizePreviewFilePath("src/\u0000evil.ts")).toBeNull();
  });
});

describe("isAllowedPreviewFileContent", () => {
  it("accepts normal file payloads", () => {
    expect(isAllowedPreviewFileContent("export default function App() { return null; }")).toBe(true);
  });

  it("rejects oversized file payloads", () => {
    const oversized = "a".repeat(1_000_001);
    expect(isAllowedPreviewFileContent(oversized)).toBe(false);
  });
});
