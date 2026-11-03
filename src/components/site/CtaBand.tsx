import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "./Icon";

export function CtaBand() {
  const { data } = useSiteSettings();
  const cta = data?.cta;
  const bg = cta?.mediaUrl || "/e.png";
  return (
    <section className="py-16 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto relative overflow-hidden border border-primary/60"
        style={{ minHeight: 360 }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative p-8 sm:p-14 flex flex-col md:flex-row md:items-end md:justify-between gap-6 min-h-[360px]">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.3em] text-primary font-bold mb-3">
              // The Drop
            </div>
            <h3 className="font-display text-3xl sm:text-5xl font-black text-white uppercase leading-[0.95]">
              {cta?.heading ?? "Made for the streets."}
            </h3>
            <p className="mt-3 text-white/85 max-w-md">{cta?.sub ?? ""}</p>
          </div>
          <Link
            to="/shop"
            className="btn-primary shrink-0"
          >
            {cta?.button ?? "Shop All"}
            <Icon name="arrow-forward-outline" size={18} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}