// Valid ISO 639-1 two-letter primary language subtags
export const VALID_PRIMARY_SUBTAGS = new Set(
  ("aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch " +
   "co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga " +
   "gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja " +
   "jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv " +
   "mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or " +
   "os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr " +
   "ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi " +
   "vo wa wo xh yi yo za zh zu").split(" ")
);

// 3-letter codes that have a 2-letter preferred equivalent (deprecated per BCP 47)
export const DEPRECATED_3_LETTER = new Set(
  ("aar abk afr aka amh ara arg asm ava ave aym aze bak bam bel ben bih bis bod " +
   "bos bre bul cat ces cha che chu chv cor cos cre cym dan deu div dzo ell eng " +
   "epo est eus ewe fao fas fij fin fra fry ful gla gle glg glv grn guj hat hau " +
   "hbs heb her hin hmo hrv hun hye ibo iii iku ile ina ind ipk isl ita jav jpn " +
   "kal kan kas kat kau kaz khm kik kin kir kom kon kor kua kur lao lat lav lim " +
   "lin lit ltz lub lug mah mal mar mkd mlg mlt mon mri msa mya nau nav nbl nde " +
   "ndo nep nld nno nob nor nya oci oji ori orm oss pan pli pol por pus que roh " +
   "ron run rus sag san sin slk slv sme smo sna snd som sot spa sqi srd srp ssw " +
   "sun swa swe tah tam tat tel tgk tgl tha tir ton tsn tso tuk tur twi uig ukr " +
   "urd uzb ven vie vol wln wol xho yid yor zha zho zul").split(" ")
);

export const VALID_LANG_FORMAT = /^[a-z]{2,8}(-[a-z0-9]{1,8})*$/i;

export function isValidLangTag(lang: string): boolean {
  if (!VALID_LANG_FORMAT.test(lang)) return false;
  const primary = lang.split("-")[0].toLowerCase();
  if (primary.length === 2) return VALID_PRIMARY_SUBTAGS.has(primary);
  if (primary.length === 3) return !DEPRECATED_3_LETTER.has(primary);
  // 4+ letter primary subtags are not valid language codes in BCP 47
  // (words like "dutch", "english", "invalid" are not valid subtags)
  return false;
}

/**
 * Check whether an element has visible text content that is governed by its
 * lang attribute (i.e. not overridden by a descendant's own lang).
 */
export function hasVisibleLangText(el: Element): boolean {
  // Check text nodes
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!node.data.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent instanceof HTMLElement && (parent.hidden || parent.style.display === "none")) continue;
    let ancestor: Element | null = parent;
    let langOverridden = false;
    while (ancestor && ancestor !== el) {
      if (ancestor.hasAttribute("lang")) {
        langOverridden = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (!langOverridden) return true;
  }

  // Check img alt text (announced in the element's language)
  for (const img of el.querySelectorAll("img[alt]")) {
    const alt = img.getAttribute("alt")?.trim();
    if (!alt) continue;
    let ancestor: Element | null = img.parentElement;
    let langOverridden = false;
    while (ancestor && ancestor !== el) {
      if (ancestor.hasAttribute("lang")) {
        langOverridden = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (!langOverridden) return true;
  }

  return false;
}
