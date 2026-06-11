import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Edit2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  fetchVanexCities,
  getSubCitiesFromCity,
  type VanexCity,
  type VanexSubCity,
} from "@/services/vanexService";
import { fetchMyOrders, type Order } from "@/services/ordersService";
import { toast } from "sonner";

export interface ShippingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  placeName: string;
  vanexCityId: number | null;
  vanexSubCityId: number | null;
}

export const EMPTY_SHIPPING: ShippingFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  placeName: "",
  vanexCityId: null,
  vanexSubCityId: null,
};

interface ShippingSectionProps {
  formData: ShippingFormData;
  onChange: (data: ShippingFormData) => void;
  onValidChange: (valid: boolean) => void;
  onSubCityChange: (sub: VanexSubCity | null) => void;
}

export default function ShippingSection({
  formData,
  onChange,
  onValidChange,
  onSubCityChange,
}: ShippingSectionProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  const [mode, setMode] = useState<"card" | "edit">("edit");
  const [vanexCities, setVanexCities] = useState<VanexCity[]>([]);
  const [vanexSubCities, setVanexSubCities] = useState<VanexSubCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [touched, setTouched] = useState(false);

  // Load Vanex cities on mount
  useEffect(() => {
    setCitiesLoading(true);
    fetchVanexCities()
      .then((cities) => setVanexCities(cities))
      .catch(() => toast.error("Failed to load delivery cities"))
      .finally(() => setCitiesLoading(false));
  }, []);

  // Pre-fill from user's last order (if any)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setPrefilling(true);
    fetchMyOrders(user.id)
      .then((orders) => {
        if (cancelled || orders.length === 0) return;
        const last = orders[0] as Order;
        const seeded: ShippingFormData = {
          firstName: last.first_name || "",
          lastName: last.last_name || "",
          email: last.email || user.email || "",
          phone: last.phone || "",
          city: last.city || "",
          placeName: last.place_name || "",
          vanexCityId: last.vanex_city_id ?? null,
          vanexSubCityId: last.vanex_sub_city_id ?? null,
        };
        onChange(seeded);
        setMode("card");
      })
      .catch(() => {
        // Silent — fall back to empty form
      })
      .finally(() => {
        if (!cancelled) setPrefilling(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // When city list loads and we have a vanexCityId from prefill, hydrate sub-cities
  useEffect(() => {
    if (!formData.vanexCityId || vanexCities.length === 0) return;
    const city = vanexCities.find((c) => c.id === formData.vanexCityId);
    if (city) {
      const subs = getSubCitiesFromCity(city);
      setVanexSubCities(subs);
      if (formData.vanexSubCityId) {
        const sub =
          subs.find((s) => s.sub_city_id === formData.vanexSubCityId) ?? null;
        onSubCityChange(sub);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vanexCityId, vanexCities]);

  // Validity calc — required fields + a sub-city (if any exist) or place name fallback
  const isValid =
    !!formData.firstName.trim() &&
    !!formData.lastName.trim() &&
    !!formData.email.trim() &&
    !!formData.phone.trim() &&
    !!formData.vanexCityId &&
    (!!formData.vanexSubCityId || !!formData.placeName.trim());

  useEffect(() => {
    // Valid from the parent's perspective ONLY when in card mode (user confirmed).
    // That way the Place Order button can't fire while the user is still editing.
    onValidChange(mode === "card" && isValid);
  }, [mode, isValid, onValidChange]);

  const update = (patch: Partial<ShippingFormData>) => {
    onChange({ ...formData, ...patch });
  };

  const handleCitySelect = (cityId: string) => {
    const id = Number(cityId);
    const city = vanexCities.find((c) => c.id === id);
    const subs = city ? getSubCitiesFromCity(city) : [];
    setVanexSubCities(subs);
    update({
      vanexCityId: id,
      city: city?.name || cityId,
      vanexSubCityId: null,
      placeName: "",
    });
    onSubCityChange(null);
  };

  const handleSubCitySelect = (subCityId: string) => {
    const id = Number(subCityId);
    const sub = vanexSubCities.find((s) => s.sub_city_id === id) ?? null;
    update({
      vanexSubCityId: id,
      placeName: sub?.sub_city_name || subCityId,
    });
    onSubCityChange(sub);
  };

  const handleSave = () => {
    setTouched(true);
    if (!isValid) {
      toast.error(t("cart.fillAllFields"));
      return;
    }
    setMode("card");
  };

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="font-display text-[10px] tracking-[0.32em] text-warm uppercase">
            {t("checkout.steps.address")}
          </p>
          <h2 className="font-display text-xl sm:text-2xl text-[#323D50] dark:text-[#F5F5F5] mt-1">
            {mode === "card"
              ? t("checkout.shipTo.heading")
              : t("cart.completeOrder")}
          </h2>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {mode === "card" ? (
          <motion.div
            key="card"
            initial={initial}
            animate={animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-warm/30 bg-warm/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-warm/15 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-warm" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <p className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]">
                  {formData.firstName} {formData.lastName}
                </p>
                <p className="text-sm text-[#323D50]/70 dark:text-white/70 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-warm" />
                  <span className="tabular-nums">{formData.phone}</span>
                </p>
                <p className="text-sm text-[#323D50]/70 dark:text-white/70 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-warm mt-0.5 shrink-0" />
                  <span className="truncate">
                    {formData.city}
                    {formData.placeName ? ` — ${formData.placeName}` : ""}
                  </span>
                </p>
                <p className="text-xs text-[#6B7B8D] dark:text-white/50 flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{formData.email}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setMode("edit")}
              className="self-start sm:self-center gap-2 h-11 px-4 text-warm hover:bg-warm/10 hover:text-warm"
            >
              <Edit2 className="w-4 h-4" />
              <span>{t("checkout.shipTo.edit")}</span>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={initial}
            animate={animate}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {prefilling && (
              <p className="text-xs text-[#6B7B8D] dark:text-white/50 italic">
                {t("checkout.shipTo.heading")}...
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id="firstName"
                label={t("checkout.form.firstName")}
                icon={User}
                value={formData.firstName}
                onChange={(v) => update({ firstName: v })}
                required
                touched={touched}
              />
              <Field
                id="lastName"
                label={t("checkout.form.lastName")}
                value={formData.lastName}
                onChange={(v) => update({ lastName: v })}
                required
                touched={touched}
              />
            </div>
            <Field
              id="email"
              label={t("checkout.form.email")}
              icon={Mail}
              type="email"
              value={formData.email}
              onChange={(v) => update({ email: v })}
              required
              touched={touched}
            />
            <Field
              id="phone"
              label={t("checkout.form.phone")}
              icon={Phone}
              type="tel"
              value={formData.phone}
              onChange={(v) => update({ phone: v })}
              required
              touched={touched}
            />

            {/* City */}
            <div className="space-y-1.5">
              <Label
                htmlFor="city"
                className="flex items-center gap-1.5 text-[10px] font-display tracking-[0.28em] uppercase text-warm"
              >
                <MapPin className="w-3 h-3" />
                {t("checkout.form.city")}
              </Label>
              <Select
                value={
                  formData.vanexCityId ? String(formData.vanexCityId) : ""
                }
                onValueChange={handleCitySelect}
                disabled={citiesLoading}
              >
                <SelectTrigger
                  id="city"
                  className="glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-12"
                >
                  <SelectValue
                    placeholder={
                      citiesLoading ? "…" : t("cart.selectCity")
                    }
                  />
                </SelectTrigger>
                <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/15 max-h-60 rounded-xl">
                  {vanexCities.map((city) => (
                    <SelectItem key={city.id} value={String(city.id)}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched && !formData.vanexCityId && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="text-xs text-red-500 dark:text-red-400"
                >
                  {t("cart.selectCity")}
                </p>
              )}
            </div>

            {/* Sub-city (area) */}
            {formData.vanexCityId && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="subCity"
                  className="flex items-center gap-1.5 text-[10px] font-display tracking-[0.28em] uppercase text-warm"
                >
                  <MapPin className="w-3 h-3" />
                  {t("checkout.form.subCity")}
                </Label>
                {vanexSubCities.length > 0 ? (
                  <Select
                    value={
                      formData.vanexSubCityId
                        ? String(formData.vanexSubCityId)
                        : ""
                    }
                    onValueChange={handleSubCitySelect}
                  >
                    <SelectTrigger
                      id="subCity"
                      className="glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-12"
                    >
                      <SelectValue placeholder={t("cart.enterPlaceName")} />
                    </SelectTrigger>
                    <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/15 max-h-60 rounded-xl">
                      {vanexSubCities.map((sub) => (
                        <SelectItem
                          key={sub.sub_city_id}
                          value={String(sub.sub_city_id)}
                        >
                          {sub.sub_city_name}
                          {sub.price != null && sub.price > 0
                            ? ` (${sub.price} LYD)`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="subCity"
                    value={formData.placeName}
                    onChange={(e) =>
                      update({
                        placeName: e.target.value,
                        vanexSubCityId: -1,
                      })
                    }
                    placeholder={t("checkout.form.placeNamePlaceholder")}
                    className="glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-12"
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1 sm:flex-none bg-warm hover:bg-warm-glow text-white rounded-xl h-12 px-6 font-medium"
              >
                {t("checkout.shipTo.save")}
              </Button>
              {/* Cancel only if there was a saved card */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon?: typeof User;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  touched?: boolean;
}

type FieldInputMode = "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none";

const AUTOCOMPLETE_BY_ID: Record<string, string> = {
  firstName: "given-name",
  lastName: "family-name",
  email: "email",
  phone: "tel",
  address: "street-address",
  city: "address-level2",
  postal: "postal-code",
  postalCode: "postal-code",
};

const INPUTMODE_BY_TYPE: Record<string, FieldInputMode> = {
  email: "email",
  tel: "tel",
  number: "numeric",
};

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  required,
  touched,
}: FieldProps) {
  const showError = required && touched && !value.trim();
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-[10px] font-display tracking-[0.28em] uppercase text-warm"
      >
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={showError || undefined}
        autoComplete={AUTOCOMPLETE_BY_ID[id]}
        inputMode={INPUTMODE_BY_TYPE[type]}
        className="glass dark:bg-white/5 bg-white/80 border-[#323D50]/15 dark:border-white/15 focus:border-warm focus:ring-warm/30 rounded-xl h-12"
      />
      {showError && (
        <p
          role="alert"
          aria-live="polite"
          className="text-xs text-red-500 dark:text-red-400"
        >
          {label}
        </p>
      )}
    </div>
  );
}
