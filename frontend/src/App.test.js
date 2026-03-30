import { render, screen } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => {
    return {
      useNavigate: () => jest.fn(),
    };
  },
  { virtual: true }
);

import LoginSelect from "./LoginSelect";

test("renders the login portal selection", () => {
  render(<LoginSelect />);
  expect(screen.getByText(/choose your portal/i)).toBeInTheDocument();
});
