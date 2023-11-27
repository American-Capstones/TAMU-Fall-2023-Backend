/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable("repository_cursors", table => {
    table.comment("Store paginate cursors for merged pull requests per repository");
    table.string("repository").notNullable().primary();
    table.string("cursor").comment("null when we add repo for the first time");
    table.timestamps(true, true);
  })
  .createTable("repository_analytics", table => {
    table.string("repository").notNullable();
    // table.foreign("repository").references("repository_cursors.repository"); // so we need to set the repo cursor before the repo
    table.integer("year").notNullable();
    table.integer("month").notNullable().checkBetween([1,12]);
    table.integer("total_pull_requests_merged");
    table.integer("total_cycle_time").comment("Total time it took to close the pull request");
    table.integer("total_first_review_time");
    table.primary(["repository", "year", "month"]); // so if it already exists, we add to it rather than create a new one
    table.timestamps(true, true);
  })
  .createTable("user_analytics", table => {
    table.string("repository").notNullable();
    table.string("user_id").notNullable().comment("github username");
    // table.foreign("repository").references("repository_cursors.repository"); // so we need to set the repo cursor before
    table.integer("year").notNullable();
    table.integer("month").notNullable().checkBetween([1,12]);
    table.integer("additions");
    table.integer("deletions");
    table.integer("pull_requests_merged");
    table.integer("pull_requests_reviews");
    table.integer("pull_requests_comments");
    table.primary(["user_id", "repository", "year", "month"]);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable("repository_analytics").dropTable("user_analytics").dropTable("repository_cursors");
};
