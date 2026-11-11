// Public privacy policy. Reachable without signing in (see PUBLIC_PATHS in app/layout.js)
// so Meta can review it and the Facebook app can be switched to Live.
// English is the primary text (Meta reviews in English); Lao follows each section.

export const metadata = {
  title: 'Privacy Policy - PP Systems Online',
  description: 'How PP Systems Online handles messages and customer information from connected Facebook Pages, Instagram and WhatsApp.',
};

const UPDATED = '12 November 2026';
const CONTACT = 'support@ppsystems-shop.com';

function Section({ en, lo, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-[#0E1A33]">{en}</h2>
      <p className="text-sm text-[#0B63E5] font-medium mt-0.5">{lo}</p>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-[100dvh] bg-[#F3F5F8] py-10 px-5">
      <article className="mx-auto max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-7 sm:p-10">
        <img src="/brand/pp-systems-logo.png" alt="PP Systems Online" className="h-9 w-auto" />
        <h1 className="mt-6 text-2xl font-bold text-[#0E1A33]">Privacy Policy</h1>
        <p className="text-sm text-[#0B63E5] font-medium">ນະໂຍບາຍຄວາມເປັນສ່ວນຕົວ</p>
        <p className="mt-2 text-sm text-gray-500">Last updated: {UPDATED}</p>

        <div className="mt-6 text-[15px] leading-relaxed text-gray-700">
          <p>
            PP Systems Online (&ldquo;we&rdquo;, &ldquo;the Service&rdquo;) is an order and customer-chat
            system used by independent retail shops in Laos. Shops connect their own Facebook Page,
            Instagram account or WhatsApp number so their staff can read and answer customer messages
            and turn them into orders from one place.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            PP Systems Online ແມ່ນລະບົບຈັດການອໍເດີ້ ແລະ ແຊັດລູກຄ້າ ສຳລັບຮ້ານຄ້າ. ແຕ່ລະຮ້ານເຊື່ອມເພຈ
            Facebook, Instagram ຫຼື WhatsApp ຂອງຕົນເອງ ເພື່ອໃຫ້ພະນັກງານອ່ານ ແລະ ຕອບຂໍ້ຄວາມລູກຄ້າ ແລະ
            ສ້າງເປັນອໍເດີ້ຈາກບ່ອນດຽວ.
          </p>
        </div>

        <Section en="Information we receive" lo="ຂໍ້ມູນທີ່ເຮົາໄດ້ຮັບ">
          <p>When a customer messages a shop&rsquo;s connected Page, Instagram or WhatsApp, we receive and store:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>the content of the messages exchanged (text, images, stickers and files sent in the chat);</li>
            <li>the customer&rsquo;s public profile name and profile picture as provided by the platform;</li>
            <li>a platform-scoped user ID used only to deliver replies to the right conversation;</li>
            <li>order details the shop&rsquo;s staff enter from the chat (such as name, phone number, delivery address and chosen courier).</li>
          </ul>
          <p>We do not collect passwords, payment card numbers, or data from people who have not contacted the shop.</p>
          <p className="text-sm text-gray-600">
            ເມື່ອລູກຄ້າສົ່ງຂໍ້ຄວາມຫາຮ້ານ ເຮົາຮັບ ແລະ ເກັບ: ເນື້ອໃນຂໍ້ຄວາມ, ຊື່ ແລະ ຮູບໂປຣໄຟລ໌ສາທາລະນະ,
            ລະຫັດຜູ້ໃຊ້ສຳລັບຕອບກັບ, ແລະ ຂໍ້ມູນອໍເດີ້ທີ່ພະນັກງານປ້ອນ (ຊື່, ເບີໂທ, ທີ່ຢູ່, ຂົນສົ່ງ).
            ເຮົາບໍ່ເກັບລະຫັດຜ່ານ ຫຼື ເລກບັດຈ່າຍເງິນ.
          </p>
        </Section>

        <Section en="How we use the information" lo="ເຮົາໃຊ້ຂໍ້ມູນເພື່ອຫຍັງ">
          <ul className="list-disc pl-5 space-y-1">
            <li>to show the shop&rsquo;s staff the incoming messages and let them reply;</li>
            <li>to create and manage the customer&rsquo;s orders, stock and delivery;</li>
            <li>to recognise a returning customer so staff do not have to re-enter their details.</li>
          </ul>
          <p>We use the information only to operate the Service for the shop. We never use it for advertising and we never sell it.</p>
          <p className="text-sm text-gray-600">
            ເຮົາໃຊ້ຂໍ້ມູນເພື່ອສະແດງຂໍ້ຄວາມໃຫ້ພະນັກງານຕອບ, ສ້າງ ແລະ ຈັດການອໍເດີ້, ແລະ ຈື່ລູກຄ້າເກົ່າ.
            ເຮົາບໍ່ຂາຍຂໍ້ມູນ ແລະ ບໍ່ໃຊ້ເພື່ອການໂຄສະນາ.
          </p>
        </Section>

        <Section en="Who can see the data" lo="ໃຜເຫັນຂໍ້ມູນໄດ້ແດ່">
          <p>
            Each shop can see only the messages and customers of its own connected accounts. One shop can
            never see another shop&rsquo;s conversations or customers. We share data with no one else, except
            where the hosting and messaging providers (Meta and the WhatsApp gateway) necessarily process the
            messages to deliver them, or where the law requires it.
          </p>
          <p className="text-sm text-gray-600">
            ແຕ່ລະຮ້ານເຫັນໄດ້ແຕ່ຂໍ້ມູນຂອງບັນຊີຕົນເອງເທົ່ານັ້ນ ຮ້ານໜຶ່ງບໍ່ສາມາດເຫັນຂໍ້ມູນຂອງອີກຮ້ານໄດ້.
            ເຮົາບໍ່ແບ່ງປັນໃຫ້ຜູ້ອື່ນ ນອກຈາກຜູ້ໃຫ້ບໍລິການສົ່ງຂໍ້ຄວາມ ຫຼື ຕາມກົດໝາຍ.
          </p>
        </Section>

        <Section en="How long we keep it" lo="ເກັບໄວ້ດົນປານໃດ">
          <p>
            We keep messages and order records for as long as the shop uses the Service, so past orders and
            conversations stay available to it. When a shop stops using the Service, or when a customer asks
            for deletion, we remove the related data as described below.
          </p>
          <p className="text-sm text-gray-600">
            ເຮົາເກັບຂໍ້ມູນໄວ້ຕາບໃດທີ່ຮ້ານຍັງໃຊ້ລະບົບ ເມື່ອຮ້ານເຊົາໃຊ້ ຫຼື ລູກຄ້າຂໍລຶບ ເຮົາຈະລຶບຂໍ້ມູນນັ້ນ.
          </p>
        </Section>

        <Section en="Deleting your data" lo="ການລຶບຂໍ້ມູນ">
          <p>
            You can ask us to delete the information connected to your Facebook, Instagram or WhatsApp account
            at any time. See our <a className="text-[#0B63E5] underline" href="/data-deletion">Data Deletion Instructions</a>,
            or email us at <a className="text-[#0B63E5] underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
          <p className="text-sm text-gray-600">
            ທ່ານຂໍໃຫ້ລຶບຂໍ້ມູນໄດ້ທຸກເວລາ ເບິ່ງ <a className="text-[#0B63E5] underline" href="/data-deletion">ວິທີຂໍລຶບຂໍ້ມູນ</a> ຫຼື
            ສົ່ງອີເມວຫາ {CONTACT}.
          </p>
        </Section>

        <Section en="Contact us" lo="ຕິດຕໍ່ເຮົາ">
          <p>
            Questions about this policy or your data: <a className="text-[#0B63E5] underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </Section>

        <p className="mt-10 text-xs text-gray-400">&copy; {new Date().getFullYear()} PP Systems Online</p>
      </article>
    </main>
  );
}
