
const { encode, decode } = (() => {
  const src = require("fs").readFileSync(__dirname + "/state-url.js", "utf8");
  const mod = { exports: {} };
  new Function("module", "exports", src + "\nmodule.exports = RecamanState;")(mod, mod.exports);
  return mod.exports;
})();

let fails = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
  else console.log(`PASS ${name}`);
}

check("encode full", encode({count:120, tempo:200, octaves:5, instrument:"bell", pentatonic:false}), "t120:m200:o5:ibell:p0");
check("decode full", decode("#t120:m200:o5:ibell:p0"), {count:120, tempo:200, octaves:5, instrument:"bell", pentatonic:false});
check("decode partial", decode("#t50:o3"), {count:50, octaves:3});
check("decode clamps out-of-range", decode("#t9999:m1:o99"), {count:150, tempo:80, octaves:6});
check("decode bogus -> null", decode("#xx:yy:zz"), null);
check("decode non-finite -> null", decode("#tInfinity"), null);
check("decode empty hash -> null", decode(""), null);
check("decode bad instrument ignored", decode("#ituba:t60"), {count:60});
check("decode bad pent flag ignored", decode("#p7:t60"), {count:60});
check("decode mixed good+bad", decode("#ibell:q42:m300"), {instrument:"bell", tempo:300});
process.exit(fails ? 1 : 0);
