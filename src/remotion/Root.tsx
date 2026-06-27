/**
 * ===========================================================================
 * الملف: Root.tsx
 * الدور: الجذر (Root) لمشروع الفيديو في Remotion.
 * هنا تُسجَّل التراكيب (Compositions) التي يمكن عرضها وتصديرها. كل تركيب
 * يمثّل نسخة من الفيديو: واحدة بالإنجليزية وأخرى بالعربية. يحدّد هذا الملف
 * أبعاد الفيديو ومعدّل الإطارات (FPS) ومدّته بالإطارات والمكوّن الذي يرسمه.
 * ===========================================================================
 */
import { Composition, Folder } from "remotion";
import { ShamaVideo } from "./Video";
import { videoSchema, defaultVideoProps } from "./schema";
import { TOTAL_FRAMES, FPS } from "./timing";

// مدّة الفيديو الكاملة بالإطارات، مأخوذة من مصدر التوقيت الموحّد في timing.ts.
const DURATION_IN_FRAMES = TOTAL_FRAMES;

/**
 * المكوّن الجذر الذي يسجّل كل تراكيب الفيديو لتظهر في استوديو Remotion.
 * يجمع النسختين (الإنجليزية والعربية) داخل مجلّد واحد باسم "Shama-Marketing".
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Shama-Marketing">
      {/* النسخة الإنجليزية من الفيديو الدعائي */}
      <Composition
        id="ShamaVideo-EN"
        component={ShamaVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        // أبعاد عمودية 1080×1920 مناسبة للقصص/الريلز على الجوال
        width={1080}
        height={1920}
        // مخطّط التحقّق (zod) من خصائص الفيديو القابلة للتعديل في الاستوديو
        schema={videoSchema}
        defaultProps={{
          ...defaultVideoProps,
          language: "en", // تجاوز اللغة الافتراضية لتثبيت الإنجليزية لهذا التركيب
        }}
      />
      {/* النسخة العربية من الفيديو الدعائي (نفس المكوّن مع اللغة العربية) */}
      <Composition
        id="ShamaVideo-AR"
        component={ShamaVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          ...defaultVideoProps,
          language: "ar", // تجاوز اللغة الافتراضية لتثبيت العربية لهذا التركيب
        }}
      />
    </Folder>
  );
};
