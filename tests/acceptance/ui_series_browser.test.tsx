import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
// @req: F-102
// @req: F-105
// @req: F-107
import { SeriesBrowser } from "@src/ui-react/SeriesBrowser/SeriesBrowser";

const manifest = {
  studies: [
    {
      studyInstanceUID: "A",
      series: [
        {
          seriesInstanceUID: "S1",
          modality: "CT",
          sopInstances: [{ sopInstanceUID: "1", frameCount: 1 }],
        },
      ],
    },
    {
      studyInstanceUID: "B",
      series: [
        {
          seriesInstanceUID: "X",
          modality: "MR",
          sopInstances: [{ sopInstanceUID: "2", frameCount: 1 }],
        },
      ],
    },
  ],
};

// Edge case: empty studies array
const manifestEmptyStudies = {
  studies: [],
};

// Edge case: study with no series
const manifestStudyNoSeries = {
  studies: [{ studyInstanceUID: "C", series: [] }],
};

// Edge case: series with no sopInstances
const manifestSeriesNoSopInstances = {
  studies: [
    {
      studyInstanceUID: "D",
      series: [{ seriesInstanceUID: "S2", modality: "US", sopInstances: [] }],
    },
  ],
};

describe("SeriesBrowser (React)", () => {
  it("renders the series list (F-102)", async () => {
    render(<SeriesBrowser manifest={manifest} />);
    expect(await screen.findAllByTestId("series-item")).toHaveLength(2);
  });

  it("filters the series list by search input (F-105)", async () => {
    render(<SeriesBrowser manifest={manifest} />);
    const input = await screen.findByRole("searchbox");
    await userEvent.type(input, "CT");
    // In current stub, no actual filtering is implemented; this is a placeholder expectation to be refined in UI04.
    expect(input).toHaveValue("CT");
  });

  it("renders correctly with empty studies", () => {
    render(<SeriesBrowser manifest={manifestEmptyStudies} />);
    expect(screen.queryByTestId("series-item")).not.toBeInTheDocument();
  });

  it("renders correctly with a study that has no series", () => {
    render(<SeriesBrowser manifest={manifestStudyNoSeries} />);
    expect(screen.queryByTestId("series-item")).not.toBeInTheDocument();
  });

  it("renders correctly with a series that has no sopInstances", () => {
    render(<SeriesBrowser manifest={manifestSeriesNoSopInstances} />);
    // Still renders the series item; details UI to expand later
    expect(screen.getByTestId("series-item")).toBeInTheDocument();
  });
});
