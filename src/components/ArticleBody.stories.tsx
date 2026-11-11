import type { Meta, StoryObj } from "@storybook/react";
import { ArticleBody } from "./ArticleBody";

const meta: Meta<typeof ArticleBody> = {
  title: "Editorial/Long-form Article Body",
  component: ArticleBody,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof ArticleBody>;

export const FashionEditorial: Story = {
  args: {
    endLabel: "END OF THE EDIT STORY",
    body: `The best wardrobes are built slowly. They begin with the pieces that earn their place, not the pieces that ask for attention.\n\n## A practice of keeping\n\nA considered garment carries its history in the detail: a softened edge, a mended seam, a fabric that has learned the shape of a life.\n\n> The things we keep are often the things that keep telling us something. — Mara Ellison\n\nTo dress with intention is not to own less for the sake of a rule. It is to notice more, and to let that attention become a lasting point of view.`,
  },
};

export const ArchitectureEditorial: Story = {
  args: {
    endLabel: "END OF THE FORM STORY",
    body: `A room changes as the day moves through it. Light finds the grain of timber, gathers along a plaster wall and makes a familiar threshold feel newly considered.\n\n## The shape of daylight\n\nArchitecture is often understood through its outlines. Its character, however, is equally present in the intervals between surfaces and in the way a space welcomes a person into it.\n\n> A good room makes room for the life that happens inside it. — Iris Bell\n\nThe result is not simply a composition to look at, but a setting to inhabit and return to.`,
  },
};

export const EmptyFallback: Story = { args: { body: "", endLabel: "STORY IN PREPARATION" } };
