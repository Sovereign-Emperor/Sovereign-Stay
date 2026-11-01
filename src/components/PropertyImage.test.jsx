import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PropertyImage from "./PropertyImage";

describe("PropertyImage", () => {
  it("replaces a failed remote image with an accessible local placeholder", () => {
    render(
      <PropertyImage
        photoId="demo-photo"
        alt="Illustrative student room"
        className="fixed-height-test"
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Illustrative student room" }));

    expect(screen.getByRole("img", { name: /Illustrative student room — image unavailable/ })).toBeInTheDocument();
    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  });
});
