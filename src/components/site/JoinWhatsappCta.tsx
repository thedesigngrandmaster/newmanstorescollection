import { motion } from "framer-motion";
import { useSiteSettings } from "@/lib/settings";
import { Icon } from "./Icon";

export function JoinWhatsappCta() {
  const { data } = useSiteSettings();
  const url = data?.footer?.socials?.whatsappChannel;
  if (!url) return null;
  return (
    <section className="py-14 px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto relative overflow-hidden p-8 sm:p-12 text-center"
        style={{ backgroundColor: "#128C7E" }}
      >
        <div className="mx-auto h-14 w-14 grid place-items-center bg-white/15 text-white mb-4">
          <Icon name="logo-whatsapp" size={28} />
        </div>
        <h3 className="font-display text-2xl sm:text-4xl font-black uppercase text-white">
          Get the drop first.
        </h3>
        <p className="mt-2 text-white/85 max-w-xl mx-auto">
          Join our WhatsApp channel — this is our newsletter. New arrivals, restocks, and members-only prices before anyone else.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 bg-white text-[#128C7E] font-black uppercase tracking-widest text-sm px-6 py-3 active:scale-[0.98] transition-transform"
        >
          <Icon name="logo-whatsapp" size={18} />
          Join our WhatsApp channel
        </a>
      </motion.div>
    </section>
  );
}