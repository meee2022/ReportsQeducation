import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getSitePassword = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "sitePassword"))
      .unique();
    return setting?.value || "123"; // Default if not set
  },
});

export const updateSitePassword = mutation({
  args: { newPassword: v.string() },
  handler: async (ctx, { newPassword }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "sitePassword"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: newPassword });
    } else {
      await ctx.db.insert("settings", { key: "sitePassword", value: newPassword });
    }
  },
});

export const getPortalLinks = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "portalLinks"))
      .unique();
    return setting?.value || {};
  },
});

export const updatePortalLink = mutation({
  args: { configId: v.string(), url: v.string() },
  handler: async (ctx, { configId, url }) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "portalLinks"))
      .unique();

    const currentLinks = { ...(existing?.value || {}) };
    currentLinks[configId] = url;

    if (existing) {
      await ctx.db.patch(existing._id, { value: currentLinks });
    } else {
      await ctx.db.insert("settings", { key: "portalLinks", value: currentLinks });
    }
  },
});

