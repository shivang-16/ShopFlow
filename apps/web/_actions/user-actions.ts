"use server";

import { apiGet } from "../lib/api-client";

export const getUser = async () => {
  const response = await apiGet("/api/user", { includeTeamId: false });
  const userData = response.data;
  return userData?.user;
};


