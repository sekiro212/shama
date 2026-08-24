/**
 * نقطة الدخول لريلز "البروفايل العطري". مستقلّة عن index.ts العام كي يبقى
 * كل فيلم بتوقيته الخاص.
 *
 *   npx remotion render src/remotion/lore/index.ts Lore-Malenia-AR out/malenia-ar.mp4
 */
import { registerRoot } from "remotion";
import { LoreRoot } from "./Root";

registerRoot(LoreRoot);
