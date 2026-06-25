import { describe, expect, it } from "vitest";
import { cellName, describeAction } from "@/utils/historyLabels";

describe("cellName", () => {
  it("names every cell of the 3×3 board", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map(cellName)).toEqual([
      "top-left",
      "top",
      "top-right",
      "left",
      "center",
      "right",
      "bottom-left",
      "bottom",
      "bottom-right",
    ]);
  });
});

describe("describeAction", () => {
  it("assigns X to even indices and O to odd indices", () => {
    expect(describeAction({ kind: "place", index: 4 }, 0).player).toBe("X");
    expect(describeAction({ kind: "place", index: 0 }, 1).player).toBe("O");
    expect(describeAction({ kind: "place", index: 8 }, 2).player).toBe("X");
  });

  it("summarizes a placement with its named cell", () => {
    expect(describeAction({ kind: "place", index: 4 }, 0)).toEqual({
      player: "X",
      move: "center",
    });
    expect(describeAction({ kind: "place", index: 0 }, 1)).toEqual({
      player: "O",
      move: "top-left",
    });
  });

  it("summarizes a shift with its plain-word direction", () => {
    expect(describeAction({ kind: "shift", dir: "top" }, 1)).toEqual({
      player: "O",
      move: "shift up",
    });
    expect(describeAction({ kind: "shift", dir: "bottom" }, 1).move).toBe(
      "shift down",
    );
    expect(describeAction({ kind: "shift", dir: "left" }, 1).move).toBe(
      "shift left",
    );
    expect(describeAction({ kind: "shift", dir: "right" }, 1).move).toBe(
      "shift right",
    );
  });
});
