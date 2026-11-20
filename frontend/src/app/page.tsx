import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import ContactColumn from "@/components/ContactColumn";
import CtaButton from "@/components/CtaButton";
import HeroMesh from "@/components/HeroMesh";
import IndustryGrid, { type IndustryItem } from "@/components/IndustryGrid";
import HomeFeatured from "@/components/HomeFeatured";
import PopStars from "@/components/PopStars";
import ReviewDeck from "@/components/ReviewDeck";
import { REVIEWS } from "@/content/reviews";

// Home page: its own address is the canonical one (title and description come
// from the site defaults in layout.tsx).
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Industry images shown below the banner: a label along the bottom edge, and a
// description typed out over the image on hover (or tap on touch screens).
const INDUSTRY_IMAGES: IndustryItem[] = [
  {
    label: "Coolstore & Warehouse",
    src: "/images/rockit_1.jpg",
    alt: "Warehouse worker scanning palletised stock with a handheld scanner",
    description:
      "RFID Asset Tracking enables you to know at any time the exact location of your goods and load carriers such as pallets, racks, roll containers, crates and boxes.",
  },
  {
    label: "Manufacturing",
    src: "/images/rockit_2.jpg",
    alt: "Engineer checking a manufacturing production line on a tablet",
    description:
      "RFID enables an automatic and correct identification and tracking of compound products and their components throughout the manufacturing, assembly and quality control process.",
  },
  {
    label: "Healthcare",
    src: "/images/rockit_3.jpg",
    alt: "Nurse scanning medical equipment on hospital storage shelves",
    description:
      "Learn how RFID is applied for asset tracking, stock management, condition monitoring, product verification, access control and patient localisation.",
  },
  {
    label: "Rental",
    src: "/images/rockit_4.jpg",
    alt: "Stacked blue crates and roll cages outside a logistics facility",
    description:
      "By automating your pooling and rental process by means of RFID technology, you get an insight into the whereabouts of your assets.",
  },
];

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


export default function Home() {
  return (
    <main className="flex-1">
      {/*
        Hero section, layered bottom to top: dark navy background, banner
        image, live elastic node network, headline.
        - Standard screens (md+): headline in the left half, image in the right
          half. Full page width (up to 1536px), 490px tall on desktop and
          scaling down with the screen (32vw), never shorter than 320px.
        - Phones: headline on top, image centered below it; the banner grows
          to fit both.
        The text column sets the banner's height (at least the sizes above),
        so the banner grows rather than clipping if the text needs more room.
      */}
      <section aria-label="Banner" className="relative mt-4 overflow-hidden bg-[#0b1f45] lg:mt-9">
        {/* Headline (above the network; lets pointer effects pass through, except the button). */}
        <div className="pointer-events-none relative z-10 px-6 pt-10 pb-2 md:flex md:min-h-[clamp(320px,32vw,490px)] md:w-1/2 md:items-center md:py-8 md:pr-6 md:pl-10 lg:pl-16">
          <div>
            <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-white" />
            {/*
              Two-part headline: a large, extra-bold "RFID tracking" in solid black
              with a crisp white outline (drawn behind the letters, so they keep
              their full shape; matches the black-and-white button), then a
              lighter supporting line.
            */}
            <h1 className="mt-6 text-balance drop-shadow-[0_2px_16px_rgb(11_31_69/0.9)]">
              <span className="block pb-1 text-[clamp(2.5rem,5vw,4.5rem)] leading-none font-extrabold tracking-[-0.02em] text-black [-webkit-text-stroke:3px_#fff] [paint-order:stroke_fill]">
                RFID tracking
              </span>{" "}
              <span className="mt-4 block text-[clamp(1.25rem,2.1vw,2rem)] leading-snug font-normal tracking-[-0.01em] text-white/90">
                for NZ warehouses, healthcare, laundry and manufacturers
              </span>
            </h1>
            {/* Supporting sentence: smaller, lighter and softer white than the headline; uses the full text width (no early wrapping). */}
            <p className="mt-5 text-[clamp(0.875rem,1.05vw,1.0625rem)] leading-relaxed font-light text-white/70 drop-shadow-[0_2px_12px_rgb(11_31_69/0.9)]">
              RF DATA supports everyone who wishes to manage their assets effectively. The information you collect through our service enables more convenient utilization.
            </p>
            {/* Call to action, right after the text the eye has just read; scrolls down to the Contact Us form. */}
            <CtaButton href="#contact" className="mt-7 md:mt-6 lg:mt-8">
              Get a quote
            </CtaButton>
          </div>
        </div>

        {/*
          Banner image: centered on phones; on standard screens it fills the
          right half (resting on the bottom edge), leaving the left half for text.
        */}
        <div className="pointer-events-none relative mx-4 my-4 aspect-[3/2] md:absolute md:inset-auto md:top-8 md:right-6 md:bottom-0 md:left-1/2 md:m-0 md:aspect-auto">
          <Image
            src="/images/banner_img.png"
            alt="RFID specialist with a handheld scanner, next to an RFID reader, tags and an asset-tracking dashboard"
            fill
            sizes="(min-width: 1536px) 768px, (min-width: 768px) 50vw, 100vw"
            preload
            className="object-contain object-center md:object-bottom"
          />
        </div>

        <HeroMesh />
      </section>

      {/*
        Industry images: four per row on desktop, two on tablets, one on
        phones; each keeps its 1600x976 shape. Side space follows the banner:
        while the page is 1536px or narrower (the banner touches the browser
        edges) they get 24px side padding (16px on phones); once the banner
        has white space beside it, they align exactly with its edges.
        (Measured on the "page" container = page width without the scrollbar.)
        Gap between sections (larger than the header-to-banner gap): 32px on
        phones, 48px from 768px, 64px from 1024px.
      */}
      <IndustryGrid
        items={INDUSTRY_IMAGES}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-12 lg:mt-16 lg:grid-cols-4 lg:gap-6 @max-[1537px]/page:px-6 @max-[640px]/page:px-4"
      />

      {/*
        Product sections: "The most popular products", "New arrivals" and
        "Special offers", from the products flagged in /admin. Each one only
        appears when it has products; they stream in after the rest of the page.
      */}
      <Suspense fallback={null}>
        <HomeFeatured />
      </Suspense>

      {/*
        Large panel below the products. Same border colour and corners as the
        other panels (slate-300, 8px), on a light grey (slate-100). Same section
        gap and side alignment as the sections above; at least 240px tall on
        phones up to 420px on desktop, growing with its content.
        Inside: "How we work" on the left and "Contact Us" on the right on
        standard screens (768px+), stacked on phones. Each starts with a large,
        bold, deep-black title.
      */}
      <div className="mt-8 md:mt-12 lg:mt-16 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
        <div className="grid min-h-[clamp(240px,28vw,420px)] grid-cols-1 content-start gap-10 rounded-lg border border-slate-300 bg-slate-100 p-6 md:grid-cols-2 md:gap-11 md:p-8">
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
          <ContactColumn />
        </div>
      </div>

      {/*
        Customer reviews. Like the banner: full page width (up to 1536px) with
        no side space even on phones, no border, black background, and the
        same live node network behind the content.
        - Left (centred): five large gold stars that pop one after another on
          a loop, the heading (always one line: its size follows the column
          width, up to 56px), a short line, and below it the team's promise
          on working closely with each client until they're happy.
        - Right: the review card deck, at its own width, with the left side
          taking the rest. Stacked on phones and tablets, side by side from 1280px.
      */}
      <section
        aria-labelledby="reviews-title"
        className="relative mt-8 mb-16 overflow-hidden bg-black md:mt-12 lg:mt-16"
      >
        <HeroMesh />
        <div className="relative grid grid-cols-1 items-center gap-12 px-6 py-14 md:px-10 md:py-20 lg:px-16 xl:grid-cols-[minmax(0,1fr)_auto] xl:gap-16">
          {/* Lets the network react to the pointer through the text. */}
          <div className="@container pointer-events-none flex flex-col items-center text-center">
            <PopStars />
            <h2
              id="reviews-title"
              className="mt-7 text-[min(3.5rem,9.2cqw)] leading-[1.1] font-extrabold whitespace-nowrap tracking-[-0.03em] text-white"
            >
              Our customers{" "}
              <span className="bg-linear-to-r from-amber-300 to-amber-500 bg-clip-text whitespace-nowrap text-transparent">love us</span>
            </h2>
            <p className="mt-4 text-[clamp(15px,1.15vw,17px)] leading-relaxed text-white/65">
              Here&apos;s what they say about working with RF DATA.
            </p>
            {/* Our promise: a short gold rule, the statement, then the team sign-off. */}
            <span aria-hidden="true" className="mt-9 h-px w-12 bg-linear-to-r from-transparent via-amber-400 to-transparent" />
            <p className="mt-6 max-w-3xl text-[clamp(16px,1.3vw,19px)] leading-relaxed font-medium text-balance text-white/90">
              We stay close to every client, from the first conversation to long after the system is up and running.
              The job isn&apos;t finished until you&apos;re happy with it.
            </p>
            <p className="mt-3 text-xs font-semibold tracking-[0.16em] text-amber-300/90 uppercase">The RF DATA team</p>
          </div>
          <ReviewDeck reviews={REVIEWS} className="justify-self-center xl:justify-self-end" />
        </div>
      </section>
    </main>
  );
}
