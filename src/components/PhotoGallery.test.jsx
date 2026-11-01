import { useRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PhotoGallery from "./PhotoGallery";

function GalleryHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const openerRef = useRef(null);

  function openGallery(event) {
    openerRef.current = event.currentTarget;
    setIsOpen(true);
  }

  return (
    <>
      <button onClick={openGallery}>Open property photos</button>
      {isOpen && (
        <PhotoGallery
          photos={["first-photo", "second-photo", "third-photo"]}
          propertyName="Demo student home"
          initialIndex={0}
          openerRef={openerRef}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

describe("PhotoGallery", () => {
  it("moves focus into the modal, closes with Escape, restores focus, and unlocks page scrolling", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);
    const opener = screen.getByRole("button", { name: "Open property photos" });

    opener.focus();
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Demo student home photo gallery" });
    expect(within(dialog).getByRole("button", { name: "Close gallery" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("traps Tab and Shift+Tab inside the gallery controls", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);
    await user.click(screen.getByRole("button", { name: "Open property photos" }));

    const closeButton = screen.getByRole("button", { name: "Close gallery" });
    const nextButton = screen.getByRole("button", { name: "Next photo" });

    nextButton.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(nextButton).toHaveFocus();
  });

  it("keeps keyboard focus inside the modal if focus lands on the dialog itself", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);
    await user.click(screen.getByRole("button", { name: "Open property photos" }));

    const dialog = screen.getByRole("dialog", { name: "Demo student home photo gallery" });
    const closeButton = screen.getByRole("button", { name: "Close gallery" });

    dialog.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    dialog.focus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Next photo" })).toHaveFocus();
  });

  it("updates the displayed photo with the labelled previous and next buttons", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);
    await user.click(screen.getByRole("button", { name: "Open property photos" }));

    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByText("02 / 03")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(screen.getByText("01 / 03")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<GalleryHarness />);
    await user.click(screen.getByRole("button", { name: "Open property photos" }));

    fireEvent.mouseDown(document.querySelector(".lightbox"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
