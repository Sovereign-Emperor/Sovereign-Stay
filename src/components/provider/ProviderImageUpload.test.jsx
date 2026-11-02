import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProviderImageUpload from "./ProviderImageUpload";

let originalCreateObjectURL;
let originalRevokeObjectURL;

beforeEach(() => {
  originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file) => `blob:preview-${file.name}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
  } else {
    delete URL.createObjectURL;
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
  } else {
    delete URL.revokeObjectURL;
  }
});

function makeImageFile(name = "room.jpg", type = "image/jpeg", contents = "image-data") {
  return new File([contents], name, { type });
}

function getPhotoInput() {
  return screen.getByLabelText(/Choose photos or drag them here/);
}

describe("ProviderImageUpload", () => {
  it("selects multiple supported images and shows thumbnails, filenames, and a cover", async () => {
    const user = userEvent.setup();
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), [
      makeImageFile("bedroom.jpg"),
      makeImageFile("exterior.webp", "image/webp"),
    ]);

    expect(screen.getByText("bedroom.jpg")).toBeInTheDocument();
    expect(screen.getByText("exterior.webp")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Preview of/ })).toHaveLength(2);
    expect(screen.getByText("Cover photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set exterior.webp as cover photo" })).toBeInTheDocument();
  });

  it("rejects unsupported image formats with an accessible error", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), makeImageFile("floorplan.gif", "image/gif"));

    expect(screen.getByRole("alert", { name: "Photo selection errors" })).toHaveTextContent(
      "floorplan.gif: choose a JPG, JPEG, PNG, or WebP image.",
    );
    expect(screen.queryByText("floorplan.gif")).not.toBeInTheDocument();
  });

  it("rejects images larger than 5 MB", async () => {
    const user = userEvent.setup();
    render(<ProviderImageUpload />);
    const oversizedImage = makeImageFile(
      "large-bedroom.png",
      "image/png",
      new Uint8Array(5 * 1024 * 1024 + 1),
    );

    await user.upload(getPhotoInput(), oversizedImage);

    expect(screen.getByRole("alert", { name: "Photo selection errors" })).toHaveTextContent(
      "large-bedroom.png: image must be 5 MB or smaller.",
    );
    expect(screen.queryByText("large-bedroom.png")).not.toBeInTheDocument();
  });

  it("removes an image, revokes its preview URL, and selects a new cover when needed", async () => {
    const user = userEvent.setup();
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), [
      makeImageFile("bedroom.jpg"),
      makeImageFile("bathroom.png", "image/png"),
    ]);
    await user.click(screen.getByRole("button", { name: "Remove bedroom.jpg" }));

    expect(screen.queryByText("bedroom.jpg")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-bedroom.jpg");
    expect(screen.getByText("Cover photo")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Preview of bathroom.png" })).toBeInTheDocument();
  });

  it("allows changing the cover image and revokes remaining URLs on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), [
      makeImageFile("bedroom.jpg"),
      makeImageFile("exterior.jpeg"),
    ]);
    await user.click(screen.getByRole("button", { name: "Set exterior.jpeg as cover photo" }));

    const coverCard = screen.getByRole("img", { name: "Preview of exterior.jpeg" }).closest("article");
    expect(coverCard).toHaveClass("provider-photo-card-cover");
    expect(coverCard).toHaveTextContent("Cover photo");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-exterior.jpeg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview-bedroom.jpg");
  });

  it("keeps a selected file and shows a fallback if the preview URL cannot be created", async () => {
    const user = userEvent.setup();
    URL.createObjectURL.mockImplementation(() => {
      throw new Error("Preview unavailable");
    });
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), makeImageFile("shared-space.jpg"));

    expect(screen.getByRole("img", { name: "Preview unavailable for shared-space.jpg" })).toBeInTheDocument();
    expect(screen.getByText("shared-space.jpg")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "shared-space.jpg: preview could not be created, but the file was selected.",
    );
  });

  it("replaces a broken thumbnail with an accessible preview fallback", async () => {
    const user = userEvent.setup();
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), makeImageFile("bedroom.jpg"));
    fireEvent.error(screen.getByRole("img", { name: "Preview of bedroom.jpg" }));

    expect(screen.getByRole("img", { name: "Preview unavailable for bedroom.jpg" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "bedroom.jpg: the image preview could not be displayed.",
    );
  });

  it("supports adding more images in a later selection", async () => {
    const user = userEvent.setup();
    render(<ProviderImageUpload />);

    await user.upload(getPhotoInput(), makeImageFile("exterior.jpg"));
    await user.upload(getPhotoInput(), makeImageFile("bathroom.png", "image/png"));

    expect(screen.getByText("exterior.jpg")).toBeInTheDocument();
    expect(screen.getByText("bathroom.png")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Preview of/ })).toHaveLength(2);
  });

  it("reports selected files, cover changes, and removals to its parent form", async () => {
    const user = userEvent.setup();
    const onImagesChange = vi.fn();
    render(<ProviderImageUpload onImagesChange={onImagesChange} />);

    await user.upload(getPhotoInput(), [
      makeImageFile("bedroom.jpg"),
      makeImageFile("exterior.webp", "image/webp"),
    ]);
    expect(onImagesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: "bedroom.jpg", isCover: true }),
      expect.objectContaining({ name: "exterior.webp", isCover: false }),
    ]);

    await user.click(screen.getByRole("button", { name: "Set exterior.webp as cover photo" }));
    expect(onImagesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: "bedroom.jpg", isCover: false }),
      expect.objectContaining({ name: "exterior.webp", isCover: true }),
    ]);
    await user.click(screen.getByRole("button", { name: "Remove bedroom.jpg" }));
    expect(onImagesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: "exterior.webp", isCover: true }),
    ]);
  });

  it("restores persisted images and their cover selection in edit mode", async () => {
    const file = makeImageFile("saved-cover.png", "image/png");
    render(
      <ProviderImageUpload
        initialImages={[{ id: "stored-photo", file, name: file.name, isCover: true }]}
      />,
    );

    expect(await screen.findByRole("img", { name: "Preview of saved-cover.png" }))
      .toBeInTheDocument();
    expect(screen.getByText("Cover photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove saved-cover.png" })).toBeInTheDocument();
  });
});
