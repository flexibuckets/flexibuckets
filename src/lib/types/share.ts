import { SharedFile, SharedFolder } from "@prisma/client";
import { UseMutationResult } from "@tanstack/react-query";

export type ShareVariables = {
  id: string;
  expiresAt: Date | null;
  teamId?: string;
  fileSize: string;
  isInfinite?: boolean;
};

export type ShareResponse = {
  downloadUrl: string;
  expiresAt: Date | null;
};

export type ShareMutation = UseMutationResult<
  ShareResponse,
  Error,
  ShareVariables,
  unknown
>;

export type SharedResponse = SharedFile | SharedFolder | null;