import { Instagram, Facebook } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Custom TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#F8F9FB] dark:bg-[#1a2235] border-t dark:border-white/10 border-[#323D50]/10 py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center space-x-3 sm:space-x-4 rtl:space-x-reverse">
            <div className="w-10 h-10 sm:w-12 sm:h-12 glass rounded-xl overflow-hidden border border-[#323D50]/10 dark:border-white/10">
              <img
                src="https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/e159f380a3a42644f03ca7442d2864b0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=8be9595c&x-expires=1753538400&x-signature=%2BNcK7CjJZDsNOmd9K1lUKJvPE8M%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=maliva"
                alt="Shama Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center sm:text-left rtl:sm:text-right">
              <h3 className="text-lg sm:text-xl font-bold text-[#5B8DD9] mb-1 sm:mb-2">
                Shama
              </h3>
              <p className="dark:text-white/60 text-[#6B7B8D] text-xs sm:text-sm">
                {t("footer.tagline")}
              </p>
            </div>
          </div>

          <div className="flex space-x-3 sm:space-x-4 rtl:space-x-reverse mt-4 sm:mt-0">
            <a
              href="https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61575028689348&mibextid=wwXIfr&rdid=ziyFSHbQTmrIb4HW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1EqWpzXQyk%2F%3Fmibextid%3DwwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="https://www.tiktok.com/@shama_625?_r=1&_d=ehaiidj2573dih&sec_uid=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&share_author_id=7492887353330516997&sharer_language=en&source=h5_m&u_code=ejkmi594adgdl5&ug_btm=b8727,b0&social_share_type=4&utm_source=copy&sec_user_id=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&tt_from=copy&utm_medium=ios&utm_campaign=client_share&enable_checksum=1&user_id=7492887353330516997&share_link_id=87C185B6-D290-4FE5-876D-5F6E6C350F98&share_app_id=1233"
              target="_blank"
              rel="noopener noreferrer"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors"
            >
              <TikTokIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="border-t dark:border-white/10 border-[#323D50]/10 mt-6 pt-6 text-center dark:text-white/60 text-[#6B7B8D] text-sm">
          <p>&copy; {t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
