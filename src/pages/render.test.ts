import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../data/seed";
import type { Session } from "../engine/types";
import Landing from "./Landing";
import Login from "./Login";
import Profile from "./Profile";
import { ApplicantDashboard, Jobs } from "./Applicant";
import { CompanyDashboard, OpportunityEditor } from "./Company";
import OpportunityPage from "./Opportunity";
import Goal from "./Goal";
import TierPage from "./Tier";
import Progress from "./Progress";
import Demo from "./Demo";

const context = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../store/useStore", () => ({
  useStore: Object.assign(
    (selector?: (state: Record<string, unknown>) => unknown) =>
      selector ? selector(context.state) : context.state,
    { getState: () => context.state },
  ),
}));
beforeEach(() => {
  context.state = {
    data: createSeed(),
    session: { role: "applicant", id: "a1" } satisfies Session,
    ready: true,
    busy: false,
    mode: "sqlite",
    theme: "light",
    message: "",
    changes: [],
    act: async () => {},
    notify: () => {},
    login: async () => {},
    resetDemo: async () => {},
  };
});
function render(
  component: ComponentType<{ saved?: boolean }>,
  path: string,
  url = path,
) {
  const warning = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      if (
        !String(args[0]).includes("useLayoutEffect does nothing on the server")
      )
        throw new Error(args.map(String).join(" "));
    });
  try {
    return renderToString(
      createElement(
        MemoryRouter,
        { initialEntries: [url] },
        createElement(
          Routes,
          null,
          createElement(Route, { path, element: createElement(component) }),
        ),
      ),
    );
  } finally {
    warning.mockRestore();
  }
}
describe("seeded portal render smoke checks", () => {
  it.each([
    ["landing", Landing, "/"],
    ["login", Login, "/login/:role", "/login/applicant"],
    ["dashboard", ApplicantDashboard, "/applicant"],
    ["profile", Profile, "/profile"],
    ["jobs", Jobs, "/jobs"],
    ["goal", Goal, "/goal"],
    ["tier", TierPage, "/tier"],
    ["progress", Progress, "/progress"],
    ["demo", Demo, "/demo"],
    ["opportunity", OpportunityPage, "/opportunity/:id", "/opportunity/j1"],
  ] as Array<[string, ComponentType<{ saved?: boolean }>, string, string?]>)(
    "renders %s without runtime exceptions",
    (_name, component, path, url) => {
      expect(render(component, path, url || path).length).toBeGreaterThan(200);
    },
  );
  it("renders the company dashboard and opportunity editors", () => {
    context.state.session = { role: "company", id: "c1" };
    expect(render(CompanyDashboard, "/company")).toContain("CivicByte");
    expect(render(OpportunityEditor, "/company/new").length).toBeGreaterThan(
      200,
    );
    expect(
      render(OpportunityEditor, "/company/edit/:id", "/company/edit/j1"),
    ).toContain("Frontend Developer");
  });
});
