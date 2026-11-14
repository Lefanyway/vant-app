import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, AvatarPicker } from "@/components/Avatar";
import { findAvatar } from "@/lib/avatars";

describe("avatars", () => {
  it("shows the initials until an avatar is chosen", () => {
    render(<Avatar name="Ana Souza" />);
    expect(screen.getByText("AS")).toBeTruthy();
  });

  it("picks an avatar from the grid and marks it selected", () => {
    const onChange = jest.fn();
    const { rerender } = render(<AvatarPicker value={null} onChange={onChange} name="Ana" />);
    fireEvent.press(screen.getByRole("radio", { name: "Jett" }));
    expect(onChange).toHaveBeenCalledWith("agent-jett");
    rerender(<AvatarPicker value="agent-jett" onChange={onChange} name="Ana" />);
    expect(screen.getByRole("radio", { name: "Jett" })).toBeSelected();
  });

  it("selects the agent portrait for a previously saved miniature", () => {
    render(<AvatarPicker value="mini-jett" onChange={jest.fn()} name="Ana" />);
    expect(screen.getByRole("radio", { name: "Jett" })).toBeSelected();
  });

  it("ignores unknown saved ids", () => {
    expect(findAvatar("gone")).toBeUndefined();
    expect(findAvatar("agent-jett")?.label).toBe("Jett");
  });
});
