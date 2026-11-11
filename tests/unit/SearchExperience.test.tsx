import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchExperience } from "@/components/SearchExperience";
import type { ComponentProps } from "react";
import type { Article } from "@/lib/types";
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
vi.mock("next/image", () => ({ default: ({ alt, ...props }: ComponentProps<"img">) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img alt={alt} {...props} />
) }));
const article: Article = { id: "1", slug: "light-language", brand: "form", title: "A new language of light", dek: "A coastal home and its materials.", category: "Interiors", tags: ["Light"], heroImage: "/test.jpg", heroAlt: "A room in daylight", imageCredit: "Test credit", author: { name: "Iris Bell", slug: "iris-bell", role: "Editor", bio: "Writes about space", avatar: "" }, publishedAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z", readMinutes: 5, featured: true, status: "PUBLISHED", body: "A long enough body for a test." };
describe("SearchExperience", () => {
  it("filters story results by text and section", async () => {
    const user = userEvent.setup(); render(<SearchExperience articles={[article]} brand="form" categories={["Interiors", "Art"]} />);
    expect(screen.getByText("A new language of light")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search editorial stories"), "brick");
    expect(screen.getByText("NO MATCHES, JUST POSSIBILITY.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CLEAR SEARCH" }));
    await user.click(screen.getByRole("button", { name: "ART" }));
    expect(screen.getByText("NO MATCHES, JUST POSSIBILITY.")).toBeInTheDocument();
  });
});
