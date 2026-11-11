// Public "data deletion instructions" page. Meta requires a data-deletion callback URL
// OR a public instructions URL before an app can go Live; this is the instructions URL.
// Reachable without signing in (see PUBLIC_PATHS in app/layout.js).

export const metadata = {
  title: 'Data Deletion Instructions - PP Systems Online',
  description: 'How to ask PP Systems Online to delete the information linked to your Facebook, Instagram or WhatsApp account.',
};

const CONTACT = 'support@ppsystems-shop.com';

export default function DataDeletion() {
  return (
    <main className="min-h-[100dvh] bg-[#F3F5F8] py-10 px-5">
      <article className="mx-auto max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-7 sm:p-10">
        <img src="/brand/pp-systems-logo.png" alt="PP Systems Online" className="h-9 w-auto" />
        <h1 className="mt-6 text-2xl font-bold text-[#0E1A33]">Data Deletion Instructions</h1>
        <p className="text-sm text-[#0B63E5] font-medium">ວິທີຂໍລຶບຂໍ້ມູນ</p>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-gray-700">
          <p>
            PP Systems Online stores the chat messages and order details that a shop receives when you
            message its Facebook Page, Instagram account or WhatsApp number. You can ask us to delete the
            information linked to your account at any time, and we do not charge for this.
          </p>
          <p className="text-sm text-gray-600">
            PP Systems Online ເກັບຂໍ້ຄວາມແຊັດ ແລະ ຂໍ້ມູນອໍເດີ້ ທີ່ຮ້ານໄດ້ຮັບເມື່ອທ່ານທັກຫາເພຈ ຫຼື WhatsApp
            ຂອງຮ້ານ ທ່ານສາມາດຂໍໃຫ້ລຶບຂໍ້ມູນທີ່ຕິດກັບບັນຊີຂອງທ່ານໄດ້ທຸກເວລາ ໂດຍບໍ່ເສຍຄ່າ.
          </p>

          <h2 className="pt-4 text-lg font-semibold text-[#0E1A33]">How to request deletion</h2>
          <p className="text-sm text-[#0B63E5] font-medium">ວິທີຂໍ</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              Send an email to <a className="text-[#0B63E5] underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> with
              the subject &ldquo;Data deletion&rdquo;.
            </li>
            <li>
              Tell us the name of the shop (Facebook Page, Instagram or WhatsApp) you messaged, and the name or
              phone number you used, so we can find your record.
            </li>
            <li>
              We will delete your messages and the customer record linked to your account within 30 days and
              email you to confirm.
            </li>
          </ol>
          <p className="text-sm text-gray-600">
            ສົ່ງອີເມວຫາ {CONTACT} ຫົວຂໍ້ &ldquo;Data deletion&rdquo; ບອກຊື່ຮ້ານທີ່ທ່ານທັກ ແລະ ຊື່/ເບີໂທທີ່ໃຊ້
            ເຮົາຈະລຶບພາຍໃນ 30 ວັນ ແລະ ແຈ້ງຢືນຢັນກັບ.
          </p>

          <p className="pt-2 text-gray-600">
            See also our <a className="text-[#0B63E5] underline" href="/privacy">Privacy Policy</a>.
          </p>
        </div>

        <p className="mt-10 text-xs text-gray-400">&copy; {new Date().getFullYear()} PP Systems Online</p>
      </article>
    </main>
  );
}
