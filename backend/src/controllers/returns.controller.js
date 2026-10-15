import { asyncHandler } from "../middlewares/asyncHandler.js";
import { badRequest } from "../utils/ApiError.js";
import { parsePagination } from "../utils/pagination.js";
import { optionalString, requireIdParam, requireString } from "../utils/validate.js";
import {
  RETURN_STATUSES,
  getReturnById,
  listAdminReturns,
  updateReturnStatus,
} from "../services/returns.service.js";
import { adminScope } from "../utils/scope.js";

export const listAdminReturnsController = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const requestedStatus =
    typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";

  if (requestedStatus && !RETURN_STATUSES.includes(requestedStatus)) {
    throw badRequest("Invalid status filter");
  }

  const { rows, meta } = await listAdminReturns({
    status: requestedStatus,
    isDemo: adminScope(req),
    page,
    limit,
    offset,
  });

  return res.status(200).json({ success: true, meta, data: rows });
});

export const getAdminReturnController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const record = await getReturnById(id, adminScope(req));

  if (!record) {
    return res.status(404).json({ success: false, message: "Return not found" });
  }

  return res.status(200).json({ success: true, data: record });
});

export const updateAdminReturnController = asyncHandler(async (req, res) => {
  const id = requireIdParam(req.params.id);
  const status = requireString(req.body?.status, "Status", { max: 20 })
    .toLowerCase();
  const adminNote = optionalString(req.body?.admin_note, "Admin note", {
    max: 1000,
  });

  const record = await updateReturnStatus(
    id,
    { status, adminNote },
    req.admin.id,
    adminScope(req)
  );

  return res.status(200).json({
    success: true,
    message: `Request ${status}`,
    data: record,
  });
});
