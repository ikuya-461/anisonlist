// 曲に表示する画像：曲のジャケットが無ければ、作品（アニメ）の表紙を代わりに出す。
// iTunes で見つからなかった曲を NO IMAGE のままにしないため。表紙も無ければ null（NO IMAGE）
export function songDisplayImage(song) {
  return song?.image_url || song?.anime_image_url || null;
}
