import type { Meta, StoryObj } from "@storybook/react";
import { ArticleCard } from "./ArticleCard";
import type { Article } from "@/lib/types";
const article: Article = { id: "story-1", slug: "the-art-of-getting-dressed-slowly", brand: "edit", title: "The art of getting dressed, slowly", dek: "A story about craft, considered choices and the things we keep.", category: "Fashion", tags: ["Style", "Craft"], heroImage: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80", heroAlt: "A fashion portrait in a considered editorial composition", imageCredit: "Demo image credit", author: { name: "Mara Ellison", slug: "mara-ellison", role: "Fashion Director", bio: "Writes about style and craft.", avatar: "" }, publishedAt: "2026-11-08T09:30:00.000Z", updatedAt: "2026-11-08T09:30:00.000Z", readMinutes: 7, featured: true, status: "PUBLISHED", body: "A story body." };
const formArticle: Article = {
  ...article,
  id: "story-form-1",
  slug: "a-new-language-of-light",
  brand: "form",
  title: "A new language of light",
  dek: "Inside a quiet architecture of thresholds, texture and daylight.",
  category: "Architecture",
  tags: ["Interiors", "Light"],
  heroImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
  heroAlt: "A calm contemporary interior with natural materials and filtered light",
  imageCredit: "Demo image credit",
  author: { name: "Iris Bell", slug: "iris-bell", role: "Design Editor", bio: "Writes about architecture and interiors.", avatar: "" },
};
const meta: Meta<typeof ArticleCard> = {
  title: "Editorial/Article Card",
  component: ArticleCard,
  args: { article, brand: "edit", variant: "standard" },
  parameters: { layout: "centered" },
  decorators: [(Story, context) => (
    <div className={`publication-shell theme-${context.args.brand}`} style={{ padding: "2rem", maxWidth: "760px" }}>
      <Story />
    </div>
  )],
};
export default meta;
type Story = StoryObj<typeof ArticleCard>;
export const Standard: Story = {};
export const Feature: Story = { args: { variant: "feature" }, parameters: { layout: "padded" } };
export const Compact: Story = { args: { variant: "compact" }, parameters: { layout: "padded" } };
export const FormStandard: Story = { args: { article: formArticle, brand: "form", variant: "standard" }, parameters: { layout: "padded" } };
export const FormFeature: Story = { args: { article: formArticle, brand: "form", variant: "feature" }, parameters: { layout: "padded" } };
