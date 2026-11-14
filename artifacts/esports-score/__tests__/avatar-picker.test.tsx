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
    fireEvent.press(screen.getByRole("radio", { name: "aspas" }));
    expect(onChange).toHaveBeenCalledWith("player-aspas");
    rerender(<AvatarPicker value="player-aspas" onChange={onChange} name="Ana" />);
    expect(screen.getByRole("radio", { name: "aspas" }).props.accessibilityState.selected).toBe(true);
    expect(screen.getByText("Fotos de jogadores: Liquipedia (CC BY-SA)")).toBeTruthy();
  });

  it("ignores unknown saved ids", () => {
    expect(findAvatar("gone")).toBeUndefined();
    expect(findAvatar("agent-jett")?.label).toBe("Jett");
  });
});
