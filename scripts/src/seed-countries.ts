/**
 * Seed countries table with ISO 3166-1 data including dial codes and flag emojis.
 * Run: pnpm --filter @workspace/scripts run seed:countries
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

const COUNTRIES = [
  { name: "Afghanistan", code: "AF", dialCode: "+93", flagEmoji: "🇦🇫" },
  { name: "Albania", code: "AL", dialCode: "+355", flagEmoji: "🇦🇱" },
  { name: "Algeria", code: "DZ", dialCode: "+213", flagEmoji: "🇩🇿" },
  { name: "Argentina", code: "AR", dialCode: "+54", flagEmoji: "🇦🇷" },
  { name: "Australia", code: "AU", dialCode: "+61", flagEmoji: "🇦🇺" },
  { name: "Austria", code: "AT", dialCode: "+43", flagEmoji: "🇦🇹" },
  { name: "Azerbaijan", code: "AZ", dialCode: "+994", flagEmoji: "🇦🇿" },
  { name: "Bahrain", code: "BH", dialCode: "+973", flagEmoji: "🇧🇭" },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flagEmoji: "🇧🇩" },
  { name: "Belarus", code: "BY", dialCode: "+375", flagEmoji: "🇧🇾" },
  { name: "Belgium", code: "BE", dialCode: "+32", flagEmoji: "🇧🇪" },
  { name: "Bolivia", code: "BO", dialCode: "+591", flagEmoji: "🇧🇴" },
  { name: "Bosnia and Herzegovina", code: "BA", dialCode: "+387", flagEmoji: "🇧🇦" },
  { name: "Brazil", code: "BR", dialCode: "+55", flagEmoji: "🇧🇷" },
  { name: "Bulgaria", code: "BG", dialCode: "+359", flagEmoji: "🇧🇬" },
  { name: "Cambodia", code: "KH", dialCode: "+855", flagEmoji: "🇰🇭" },
  { name: "Cameroon", code: "CM", dialCode: "+237", flagEmoji: "🇨🇲" },
  { name: "Canada", code: "CA", dialCode: "+1", flagEmoji: "🇨🇦" },
  { name: "Chile", code: "CL", dialCode: "+56", flagEmoji: "🇨🇱" },
  { name: "China", code: "CN", dialCode: "+86", flagEmoji: "🇨🇳" },
  { name: "Colombia", code: "CO", dialCode: "+57", flagEmoji: "🇨🇴" },
  { name: "Croatia", code: "HR", dialCode: "+385", flagEmoji: "🇭🇷" },
  { name: "Cyprus", code: "CY", dialCode: "+357", flagEmoji: "🇨🇾" },
  { name: "Czech Republic", code: "CZ", dialCode: "+420", flagEmoji: "🇨🇿" },
  { name: "Denmark", code: "DK", dialCode: "+45", flagEmoji: "🇩🇰" },
  { name: "Ecuador", code: "EC", dialCode: "+593", flagEmoji: "🇪🇨" },
  { name: "Egypt", code: "EG", dialCode: "+20", flagEmoji: "🇪🇬" },
  { name: "Estonia", code: "EE", dialCode: "+372", flagEmoji: "🇪🇪" },
  { name: "Ethiopia", code: "ET", dialCode: "+251", flagEmoji: "🇪🇹" },
  { name: "Finland", code: "FI", dialCode: "+358", flagEmoji: "🇫🇮" },
  { name: "France", code: "FR", dialCode: "+33", flagEmoji: "🇫🇷" },
  { name: "Georgia", code: "GE", dialCode: "+995", flagEmoji: "🇬🇪" },
  { name: "Germany", code: "DE", dialCode: "+49", flagEmoji: "🇩🇪" },
  { name: "Ghana", code: "GH", dialCode: "+233", flagEmoji: "🇬🇭" },
  { name: "Greece", code: "GR", dialCode: "+30", flagEmoji: "🇬🇷" },
  { name: "Hong Kong", code: "HK", dialCode: "+852", flagEmoji: "🇭🇰" },
  { name: "Hungary", code: "HU", dialCode: "+36", flagEmoji: "🇭🇺" },
  { name: "India", code: "IN", dialCode: "+91", flagEmoji: "🇮🇳" },
  { name: "Indonesia", code: "ID", dialCode: "+62", flagEmoji: "🇮🇩" },
  { name: "Iraq", code: "IQ", dialCode: "+964", flagEmoji: "🇮🇶" },
  { name: "Ireland", code: "IE", dialCode: "+353", flagEmoji: "🇮🇪" },
  { name: "Israel", code: "IL", dialCode: "+972", flagEmoji: "🇮🇱" },
  { name: "Italy", code: "IT", dialCode: "+39", flagEmoji: "🇮🇹" },
  { name: "Japan", code: "JP", dialCode: "+81", flagEmoji: "🇯🇵" },
  { name: "Jordan", code: "JO", dialCode: "+962", flagEmoji: "🇯🇴" },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7", flagEmoji: "🇰🇿" },
  { name: "Kenya", code: "KE", dialCode: "+254", flagEmoji: "🇰🇪" },
  { name: "Kuwait", code: "KW", dialCode: "+965", flagEmoji: "🇰🇼" },
  { name: "Kyrgyzstan", code: "KG", dialCode: "+996", flagEmoji: "🇰🇬" },
  { name: "Latvia", code: "LV", dialCode: "+371", flagEmoji: "🇱🇻" },
  { name: "Lebanon", code: "LB", dialCode: "+961", flagEmoji: "🇱🇧" },
  { name: "Libya", code: "LY", dialCode: "+218", flagEmoji: "🇱🇾" },
  { name: "Lithuania", code: "LT", dialCode: "+370", flagEmoji: "🇱🇹" },
  { name: "Luxembourg", code: "LU", dialCode: "+352", flagEmoji: "🇱🇺" },
  { name: "Malaysia", code: "MY", dialCode: "+60", flagEmoji: "🇲🇾" },
  { name: "Mexico", code: "MX", dialCode: "+52", flagEmoji: "🇲🇽" },
  { name: "Moldova", code: "MD", dialCode: "+373", flagEmoji: "🇲🇩" },
  { name: "Morocco", code: "MA", dialCode: "+212", flagEmoji: "🇲🇦" },
  { name: "Myanmar", code: "MM", dialCode: "+95", flagEmoji: "🇲🇲" },
  { name: "Nepal", code: "NP", dialCode: "+977", flagEmoji: "🇳🇵" },
  { name: "Netherlands", code: "NL", dialCode: "+31", flagEmoji: "🇳🇱" },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flagEmoji: "🇳🇿" },
  { name: "Nigeria", code: "NG", dialCode: "+234", flagEmoji: "🇳🇬" },
  { name: "Norway", code: "NO", dialCode: "+47", flagEmoji: "🇳🇴" },
  { name: "Oman", code: "OM", dialCode: "+968", flagEmoji: "🇴🇲" },
  { name: "Pakistan", code: "PK", dialCode: "+92", flagEmoji: "🇵🇰" },
  { name: "Palestine", code: "PS", dialCode: "+970", flagEmoji: "🇵🇸" },
  { name: "Peru", code: "PE", dialCode: "+51", flagEmoji: "🇵🇪" },
  { name: "Philippines", code: "PH", dialCode: "+63", flagEmoji: "🇵🇭" },
  { name: "Poland", code: "PL", dialCode: "+48", flagEmoji: "🇵🇱" },
  { name: "Portugal", code: "PT", dialCode: "+351", flagEmoji: "🇵🇹" },
  { name: "Qatar", code: "QA", dialCode: "+974", flagEmoji: "🇶🇦" },
  { name: "Romania", code: "RO", dialCode: "+40", flagEmoji: "🇷🇴" },
  { name: "Russia", code: "RU", dialCode: "+7", flagEmoji: "🇷🇺" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flagEmoji: "🇸🇦" },
  { name: "Senegal", code: "SN", dialCode: "+221", flagEmoji: "🇸🇳" },
  { name: "Serbia", code: "RS", dialCode: "+381", flagEmoji: "🇷🇸" },
  { name: "Singapore", code: "SG", dialCode: "+65", flagEmoji: "🇸🇬" },
  { name: "Slovakia", code: "SK", dialCode: "+421", flagEmoji: "🇸🇰" },
  { name: "Slovenia", code: "SI", dialCode: "+386", flagEmoji: "🇸🇮" },
  { name: "South Africa", code: "ZA", dialCode: "+27", flagEmoji: "🇿🇦" },
  { name: "South Korea", code: "KR", dialCode: "+82", flagEmoji: "🇰🇷" },
  { name: "Spain", code: "ES", dialCode: "+34", flagEmoji: "🇪🇸" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flagEmoji: "🇱🇰" },
  { name: "Sweden", code: "SE", dialCode: "+46", flagEmoji: "🇸🇪" },
  { name: "Switzerland", code: "CH", dialCode: "+41", flagEmoji: "🇨🇭" },
  { name: "Taiwan", code: "TW", dialCode: "+886", flagEmoji: "🇹🇼" },
  { name: "Tajikistan", code: "TJ", dialCode: "+992", flagEmoji: "🇹🇯" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", flagEmoji: "🇹🇿" },
  { name: "Thailand", code: "TH", dialCode: "+66", flagEmoji: "🇹🇭" },
  { name: "Tunisia", code: "TN", dialCode: "+216", flagEmoji: "🇹🇳" },
  { name: "Turkey", code: "TR", dialCode: "+90", flagEmoji: "🇹🇷" },
  { name: "Turkmenistan", code: "TM", dialCode: "+993", flagEmoji: "🇹🇲" },
  { name: "Uganda", code: "UG", dialCode: "+256", flagEmoji: "🇺🇬" },
  { name: "Ukraine", code: "UA", dialCode: "+380", flagEmoji: "🇺🇦" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flagEmoji: "🇦🇪" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flagEmoji: "🇬🇧" },
  { name: "United States", code: "US", dialCode: "+1", flagEmoji: "🇺🇸" },
  { name: "Uzbekistan", code: "UZ", dialCode: "+998", flagEmoji: "🇺🇿" },
  { name: "Venezuela", code: "VE", dialCode: "+58", flagEmoji: "🇻🇪" },
  { name: "Vietnam", code: "VN", dialCode: "+84", flagEmoji: "🇻🇳" },
  { name: "Yemen", code: "YE", dialCode: "+967", flagEmoji: "🇾🇪" },
  { name: "Zimbabwe", code: "ZW", dialCode: "+263", flagEmoji: "🇿🇼" },
];

async function main() {
  console.log(`Seeding ${COUNTRIES.length} countries...`);

  for (const country of COUNTRIES) {
    await sql`
      INSERT INTO countries (name, code, dial_code, flag_emoji, is_active, is_registration_allowed)
      VALUES (${country.name}, ${country.code}, ${country.dialCode}, ${country.flagEmoji}, true, true)
      ON CONFLICT (code) DO UPDATE SET
        name       = EXCLUDED.name,
        dial_code  = EXCLUDED.dial_code,
        flag_emoji = EXCLUDED.flag_emoji,
        updated_at = now()
    `;
  }

  console.log(`✅ Seeded ${COUNTRIES.length} countries successfully`);
  await sql.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
