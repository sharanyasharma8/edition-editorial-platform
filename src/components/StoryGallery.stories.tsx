import type { Meta, StoryObj } from "@storybook/react";
import { StoryGallery } from "./StoryGallery";

const meta: Meta<typeof StoryGallery> = {
  title: "Editorial/Story Gallery",
  component: StoryGallery,
  parameters: { layout: "padded" },
  decorators: [(Story, context) => (
    <div className={`publication-shell theme-${context.parameters.brand ?? "edit"}`} style={{ padding: "2rem" }}>
      <Story />
    </div>
  )],
};
export default meta;
type Story = StoryObj<typeof StoryGallery>;

export const TheEdit: Story = {
  parameters: { brand: "edit" },
  args: {
    images: [
      { src: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1600&q=85", alt: "A fashion portrait in a sculptural neutral-toned look", credit: "Demo editorial image credit" },
      { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85", alt: "A curated clothing rail in a softly lit studio", credit: "Demo editorial image credit" },
    ],
  },
};

export const Form: Story = {
  parameters: { brand: "form" },
  args: {
    images: [
      { src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85", alt: "A contemporary interior with layered natural materials", credit: "Demo editorial image credit" },
      { src: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85", alt: "A light-filled architectural living space", credit: "Demo editorial image credit" },
    ],
  },
};

export const NoImages: Story = { args: { images: [] } };
