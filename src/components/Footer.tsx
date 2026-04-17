import { useLanguage } from "@/contexts/LanguageContext";

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" />
  </svg>
);

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

          <div className="flex gap-2 sm:gap-3 rtl:space-x-reverse mt-2 sm:mt-0">
            <a
              href="https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[#5B8DD9]/10"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61575028689348&mibextid=wwXIfr&rdid=ziyFSHbQTmrIb4HW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1EqWpzXQyk%2F%3Fmibextid%3DwwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[#5B8DD9]/10"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
            <a
              href="https://www.tiktok.com/@shama_625?_r=1&_d=ehaiidj2573dih&sec_uid=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&share_author_id=7492887353330516997&sharer_language=en&source=h5_m&u_code=ejkmi594adgdl5&ug_btm=b8727,b0&social_share_type=4&utm_source=copy&sec_user_id=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&tt_from=copy&utm_medium=ios&utm_campaign=client_share&enable_checksum=1&user_id=7492887353330516997&share_link_id=87C185B6-D290-4FE5-876D-5F6E6C350F98&share_app_id=1233"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="dark:text-white/60 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[#5B8DD9]/10"
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
