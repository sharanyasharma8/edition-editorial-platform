export const ARTICLE_CARD_FIELDS = /* GraphQL */ `
  fragment ArticleCardFields on Article {
    id slug brand title dek category tags galleryImages { src alt credit } heroImage heroAlt imageCredit
    author { name slug role avatar }
    publishedAt readMinutes featured status
  }
`;
export const HOME_FEED_QUERY = /* GraphQL */ `
  query HomeFeed($brand: String!, $limit: Int!) {
    articles(brand: $brand, limit: $limit) { ...ArticleCardFields }
  }
  ${ARTICLE_CARD_FIELDS}
`;
export const CATEGORY_FEED_QUERY = /* GraphQL */ `
  query CategoryFeed($brand: String!, $category: String!, $limit: Int!) {
    articles(brand: $brand, category: $category, limit: $limit) { ...ArticleCardFields }
  }
  ${ARTICLE_CARD_FIELDS}
`;
export const ARTICLE_QUERY = /* GraphQL */ `
  query ArticleBySlug($brand: String!, $slug: String!) {
    article(brand: $brand, slug: $slug) {
      ...ArticleCardFields
      body
    }
  }
  ${ARTICLE_CARD_FIELDS}
`;

export const TAG_FEED_QUERY = /* GraphQL */ `
  query TagFeed($brand: String!, $tag: String!, $limit: Int!) {
    articles(brand: $brand, tag: $tag, limit: $limit) { ...ArticleCardFields }
  }
  ${ARTICLE_CARD_FIELDS}
`;
