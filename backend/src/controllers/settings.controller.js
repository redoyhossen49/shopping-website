import { asyncHandler } from "../middlewares/asyncHandler.js";
import { getSettings, updateSettings } from "../services/settings.service.js";
import { optionalString } from "../utils/validate.js";
import { forbidden } from "../utils/ApiError.js";
import { adminScope } from "../utils/scope.js";

export const getSettingsController = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  return res.status(200).json({ success: true, data: settings });
});

export const updateSettingsController = asyncHandler(async (req, res) => {
  // store_settings is a singleton shared by the whole deployment, so the
  // public demo must never be able to change it.
  if (adminScope(req)) {
    throw forbidden("The demo account cannot change store settings");
  }

  const patch = {
    store_name: optionalString(req.body?.store_name, "Store name", { max: 120 }),
    currency: optionalString(req.body?.currency, "Currency", { max: 10 }),
    support_email: optionalString(req.body?.support_email, "Support email", {
      max: 254,
    }),
  };

  if (req.body?.default_low_stock_threshold !== undefined) {
    patch.default_low_stock_threshold = Number(req.body.default_low_stock_threshold);
  }

  if (req.body?.default_shipping_fee !== undefined) {
    patch.default_shipping_fee = Number(req.body.default_shipping_fee);
  }

  const settings = await updateSettings(patch);
  return res.status(200).json({ success: true, data: settings });
});
