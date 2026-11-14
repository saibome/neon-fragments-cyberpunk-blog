import { cardStaticPaths, generateOgImage } from '../../../../../lib/ogImage';
import type { BlogPost } from '../../../../../../types';

export const getStaticPaths = cardStaticPaths;

export async function GET({ props }: { props: { post: BlogPost } }) {
  try {
    const png = await generateOgImage(props.post);
    const body = new ArrayBuffer(png.byteLength);
    new Uint8Array(body).set(png);
    return new Response(body, {
      headers: { 'Content-Type': 'image/png' }
    });
  } catch (error) {
    console.error('[og-image] 生成失败', error);
    return new Response('分享图片生成失败', { status: 500 });
  }
}
