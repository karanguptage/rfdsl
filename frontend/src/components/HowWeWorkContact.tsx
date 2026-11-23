import Image from "next/image";
import ContactColumn from "@/components/ContactColumn";

// "How we work" steps, in order; images in public/howwork (359x240).
const HOW_WE_WORK = [
  {
    title: "Order & Enquiry",
    src: "/howwork/order.png",
    alt: "Customer service agent with a headset answering an enquiry at a laptop",
    description:
      "Submit your order or enquiry through our website's contact page, or get in touch with us directly using our contact details.",
  },
  {
    title: "Customer Consultation",
    src: "/howwork/consultation.png",
    alt: "Small team discussing requirements around a café table",
    description:
      "We discuss your requirements, business needs and intended applications to understand your expectations and identify the right approach.",
  },
  {
    title: "On-Site Assessment",
    src: "/howwork/Assessment.png",
    alt: "Corridor of storage units with red roller doors",
    description:
      "If required, our team visits your premises to evaluate the working environment, existing infrastructure and specific operational needs.",
  },
  {
    title: "Product & Solution Recommendation",
    src: "/howwork/product.png",
    alt: "Range of RFID handhelds, readers, printers and tags",
    description:
      "Based on your requirements and our assessment, we recommend the most appropriate RFID tags, readers, printers and related solutions.",
  },
  {
    title: "Installation & Integration",
    src: "/howwork/install.png",
    alt: "Warehouse entrance fitted with RFID gate antennas",
    description:
      "Where necessary, we provide equipment installation, software configuration and system integration to ensure everything works seamlessly with your existing operations.",
  },
  {
    title: "Testing & Support",
    src: "/howwork/Testing.png",
    alt: "Engineer checking a 3D warehouse model on a laptop",
    description:
      "We check the completed solution to ensure it meets your requirements and provide ongoing technical assistance whenever needed.",
  },
];

/*
  Large panel with "How we work" and "Contact Us", used on the home page and at
  the bottom of each product page. Same border colour and corners as the other
  panels (slate-300, 8px), on a light grey (slate-100); at least 240px tall on
  phones up to 420px on desktop, growing with its content. Side by side on
  standard screens (768px+), stacked on phones. Each starts with a large,
  bold, deep-black title.
  - Default (home page): "How we work" on the left, "Contact Us" on the right.
  - `reversed` (product pages): "Contact Us" on the left (and first on phones),
    "How we work" on the right, so the form comes straight after the product.
  `className` sets the outer spacing (section gap, side padding);
  `defaultMessage` pre-fills the contact form's message.
*/
export default function HowWeWorkContact({
  reversed = false,
  className,
  defaultMessage,
}: {
  reversed?: boolean;
  className?: string;
  defaultMessage?: string;
}) {
  const contact = <ContactColumn defaultMessage={defaultMessage} />;
  return (
    <div className={className}>
      <div className="grid min-h-[clamp(240px,28vw,420px)] grid-cols-1 content-start gap-10 rounded-lg border border-slate-300 bg-slate-100 p-6 md:grid-cols-2 md:gap-11 md:p-8">
        {reversed ? (
          <>
            {contact}
            <HowWeWork />
          </>
        ) : (
          <>
            <HowWeWork />
            {contact}
          </>
        )}
      </div>
    </div>
  );
}

function HowWeWork() {
  return (
    <section aria-labelledby="how-we-work-title">
      <h2
        id="how-we-work-title"
        className="text-[clamp(1.75rem,2.4vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em] text-neutral-950"
      >
        How we work
      </h2>

      {/*
        Steps: image on the left, white text panel on the right; the two
        are always the same height (the image fills its frame, cropping
        if the text is taller). Image frame: 1px slate border, 1px white
        gap, slightly rounded corners (as the industry images). When the
        column is narrower than 512px (phones, tablets, 1024px screens), the image
        sits above its panel instead.
      */}
      <ol className="@container mt-6 flex flex-col gap-4 md:mt-8">
        {HOW_WE_WORK.map((step, i) => (
          <li key={step.src} className="grid grid-cols-1 gap-3 @[32rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @[32rem]:gap-4">
            <div className="rounded-lg border border-slate-300 bg-white p-px">
              <div className="relative h-full overflow-hidden rounded-[6px]">
                {/* Sets the minimum height (the image's 359x240 shape). */}
                <div aria-hidden="true" className="aspect-[359/240]" />
                <Image
                  src={step.src}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1536px) 280px, (min-width: 768px) 20vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-lg border border-slate-300 bg-white p-4 lg:p-5">
              <h3 className="flex items-baseline gap-2.5 text-[clamp(1rem,1.15vw,1.125rem)] leading-snug font-bold text-neutral-950">
                <span className="bg-linear-to-r from-sky-600 to-blue-700 bg-clip-text font-extrabold tabular-nums text-transparent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
