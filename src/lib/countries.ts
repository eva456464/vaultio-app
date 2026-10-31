/** Search Console reports countries as ISO 3166-1 alpha-3 codes ("usa"); Intl names regions by alpha-2. */

// Each entry is the lowercase alpha-3 code followed by the alpha-2 code (generated from the ISO 3166-1 list).
const PAIRS = (
  "abwAW afgAF agoAO aiaAI alaAX albAL andAD areAE argAR armAM asmAS ataAQ atfTF atgAG ausAU autAT " +
  "azeAZ bdiBI belBE benBJ besBQ bfaBF bgdBD bgrBG bhrBH bhsBS bihBA blmBL blrBY blzBZ bmuBM bolBO " +
  "braBR brbBB brnBN btnBT bvtBV bwaBW cafCF canCA cckCC cheCH chlCL chnCN civCI cmrCM codCD cogCG " +
  "cokCK colCO comKM cpvCV criCR cubCU cuwCW cxrCX cymKY cypCY czeCZ deuDE djiDJ dmaDM dnkDK domDO " +
  "dzaDZ ecuEC egyEG eriER eshEH espES estEE ethET finFI fjiFJ flkFK fraFR froFO fsmFM gabGA gbrGB " +
  "geoGE ggyGG ghaGH gibGI ginGN glpGP gmbGM gnbGW gnqGQ grcGR grdGD grlGL gtmGT gufGF gumGU guyGY " +
  "hkgHK hmdHM hndHN hrvHR htiHT hunHU idnID imnIM indIN iotIO irlIE irnIR irqIQ islIS isrIL itaIT " +
  "jamJM jeyJE jorJO jpnJP kazKZ kenKE kgzKG khmKH kirKI knaKN korKR kwtKW laoLA lbnLB lbrLR lbyLY " +
  "lcaLC lieLI lkaLK lsoLS ltuLT luxLU lvaLV macMO mafMF marMA mcoMC mdaMD mdgMG mdvMV mexMX mhlMH " +
  "mkdMK mliML mltMT mmrMM mneME mngMN mnpMP mozMZ mrtMR msrMS mtqMQ musMU mwiMW mysMY mytYT namNA " +
  "nclNC nerNE nfkNF ngaNG nicNI niuNU nldNL norNO nplNP nruNR nzlNZ omnOM pakPK panPA pcnPN perPE " +
  "phlPH plwPW pngPG polPL priPR prkKP prtPT pryPY psePS pyfPF qatQA reuRE rouRO rusRU rwaRW sauSA " +
  "sdnSD senSN sgpSG sgsGS shnSH sjmSJ slbSB sleSL slvSV smrSM somSO spmPM srbRS ssdSS stpST surSR " +
  "svkSK svnSI sweSE swzSZ sxmSX sycSC syrSY tcaTC tcdTD tgoTG thaTH tjkTJ tklTK tkmTM tlsTL tonTO " +
  "ttoTT tunTN turTR tuvTV twnTW tzaTZ ugaUG ukrUA umiUM uryUY usaUS uzbUZ vatVA vctVC venVE vgbVG " +
  "virVI vnmVN vutVU wlfWF wsmWS xkkXK yemYE zafZA zmbZM zweZW "
).split(" ");

const ALPHA2 = new Map(PAIRS.filter(Boolean).map((pair) => [pair.slice(0, 3), pair.slice(3)]));

/** Country name in the given locale, or the code itself when it isn't a known country. */
export function countryName(alpha3: string, locale: string) {
  const code = ALPHA2.get(alpha3.toLowerCase());
  if (!code) return alpha3.toUpperCase();
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
