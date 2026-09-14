/** Constantes do processamento do RouteFix. */

export const VIACEP_TIMEOUT = 4_000;
export const VIACEP_THREADS = 15;
export const SIMILARIDADE_MINIMA = 80;
export const COORD_CONFLICT_METERS = 50;
export const COORD_SAME_STREET_DIFF = 100;

export const COMP_KEYWORDS = /\b(CJ|Conj\.?|Sala|Sl\.?|Bloco|Bl\.?|Torre|Ap\.?|Apto\.?|Apt\.?|Andar)\b\s+\S+\s*$/i;
export const SN_PATTERN = /^(SN|S\/N|S\.N\.?|S\.N)$/i;

export const ABREVIACOES = {
  "r": "rua", "r.": "rua",
  "av": "avenida", "av.": "avenida",
  "al": "alameda", "al.": "alameda",
  "tv": "travessa", "tv.": "travessa",
  "rod": "rodovia", "rod.": "rodovia",
  "est": "estrada", "est.": "estrada",
  "lg": "largo", "lg.": "largo",
  "pc": "praca", "pca": "praca", "pç": "praca", "pça": "praca",
  "dr": "doutor", "dr.": "doutor",
  "dra": "doutora", "dra.": "doutora",
  "pe": "padre", "pe.": "padre",
  "prof": "professor", "prof.": "professor",
  "eng": "engenheiro", "eng.": "engenheiro",
  "gen": "general", "gen.": "general",
  "cel": "coronel", "cel.": "coronel",
  "cap": "capitao", "cap.": "capitao",
  "maj": "major", "maj.": "major",
  "dep": "deputado", "dep.": "deputado",
  "des": "desembargador",
  "pres": "presidente", "pres.": "presidente",
  "min": "ministro", "min.": "ministro",
  "mal": "marechal", "mal.": "marechal",
  "vsc": "visconde", "vsc.": "visconde",
  "bar": "barao", "bar.": "barao",
  "sto": "santo", "sto.": "santo",
  "sta": "santa", "sta.": "santa",
  "fco": "francisco", "fco.": "francisco",
  "ant": "antonio", "ant.": "antonio",
  "jd": "jardim", "jd.": "jardim",
  "vl": "vila", "vl.": "vila",
  "pq": "parque", "pq.": "parque",
  "cj": "conjunto", "cj.": "conjunto"
};
