import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { useSiteSettings } from "@/lib/settings";
import { Link, useRouterState } from "@tanstack/react-router";

export function Hero() {
  const { data: settings } = useSiteSettings();
  const hero = settings?.hero;

  return (
    <section className="relative min-h-[92vh] pt-24 flex items-center overflow-hidden">
      {/* Media slot: works with ANY hero video or image */}
      <div className="absolute inset-0 -z-10">
        {hero?.mediaUrl ? (
          hero.mediaType === "video" ? (
            <video
              key={hero.mediaUrl}
              src={hero.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <img src={hero.mediaUrl} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--primary) 25%, transparent), transparent 60%), radial-gradient(circle at 80% 70%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 55%), var(--background)",
            }}
          />
        )}
        {hero?.mediaUrl && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${hero.overlay ?? 0.35})` }}
          />
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`font-display font-bold text-4xl sm:text-6xl md:text-7xl leading-[1.02] ${
            hero?.mediaUrl ? "text-white" : "text-foreground"
          }`}
        >
          {hero?.headline ?? "Step Into Something Legendary"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`mt-5 text-base sm:text-lg max-w-2xl mx-auto ${
            hero?.mediaUrl ? "text-white/85" : "text-muted-foreground"
          }`}
        >
          {hero?.subheadline ?? ""}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 flex flex-wrap gap-3 justify-center"
        >
          <a href="/shop" className="btn-primary">
            {hero?.ctaPrimary ?? "Shop the Drop"}
            <Icon name="arrow-forward-outline" size={18} />
          </a>
          {hero?.ctaSecondary && (
            <a
              href="/track-order"
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-medium border transition-colors ${
                hero?.mediaUrl
                  ? "border-white/60 text-white hover:bg-white/10"
                  : "border-foreground/20 hover:bg-foreground/5"
              }`}
            >
              {hero.ctaSecondary}
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
