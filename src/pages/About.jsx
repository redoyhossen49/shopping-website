
import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiShoppingBag,
  FiHeart,
  FiShield,
  FiTruck,
  FiCheckCircle,
  FiStar,
} from "react-icons/fi";

const categories = [
  {
    title: "Men's Clothing",
    description: "Discover everyday essentials and timeless styles.",
    image:
      "https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "men's clothing",
  },
  {
    title: "Women's Clothing",
    description: "Explore fashion for every mood and occasion.",
    image:
      "https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "women's clothing",
  },
  {
    title: "Jewellery",
    description: "Find the finishing touch for your personal style.",
    image:
      "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "jewelery",
  },
  {
    title: "Electronics",
    description: "Explore technology for everyday living.",
    image:
      "https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=800",
    category: "electronics",
  },
];

const benefits = [
  {
    icon: FiShoppingBag,
    title: "Easy Shopping",
    description:
      "Browse different product categories in one convenient place.",
  },
  {
    icon: FiShield,
    title: "A Reliable Experience",
    description:
      "Enjoy a straightforward and user-friendly shopping journey.",
  },
  {
    icon: FiHeart,
    title: "Made for You",
    description:
      "Discover products for your style, interests, and everyday needs.",
  },
  {
    icon: FiTruck,
    title: "Convenient Ordering",
    description:
      "Move from exploring products to placing your order with ease.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen text-blue-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#172554] via-[#233765] to-[#334780]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:px-10 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-indigo-100 backdrop-blur-sm">
              <FiStar className="text-indigo-300" />
              Get to know NovaShop
            </div>

            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Shopping made simple.
              <span className="mt-2 block text-indigo-300">
                Choices made yours.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
              Discover fashion, jewellery, and electronics in one convenient
              destination. We bring product variety and a simple shopping
              experience together.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-400"
              >
                Explore Products
                <FiArrowRight />
              </Link>

              <a
                href="#our-story"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                Our Story
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-200">
              <span className="flex items-center gap-2">
                <FiCheckCircle className="text-indigo-300" />
                Multiple categories
              </span>
              <span className="flex items-center gap-2">
                <FiCheckCircle className="text-indigo-300" />
                Simple browsing
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-4 rounded-[2rem] bg-indigo-300/10 blur-2xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
              <img
                src="https://images.pexels.com/photos/5650042/pexels-photo-5650042.jpeg?auto=compress&cs=tinysrgb&w=1000"
                alt="A curated shopping collection"
                width="1000"
                height="667"
                decoding="async"
                fetchPriority="high"
                className="h-[300px] w-full rounded-[1.5rem] object-cover sm:h-[380px]"
              />

              <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <p className="text-sm font-medium text-indigo-600">
                  Welcome to NovaShop
                </p>
                <h2 className="mt-1 text-xl font-bold text-blue-950 sm:text-2xl">
                  Everything you love, in one place.
                </h2>
              </div>
            </div>

            <div className="absolute -right-3 top-8 rounded-2xl border border-white/60 bg-[#e8edfa] px-4 py-3 shadow-xl sm:-right-5">
              <FiShoppingBag className="mb-1 text-xl text-indigo-600" />
              <p className="text-sm font-bold text-blue-950">
                Shop your way
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section
        id="our-story"
        className="scroll-mt-24 bg-[#e8edfa] px-5 py-16 sm:px-8 sm:py-20 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Our Story
            </p>

            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-blue-950 sm:text-4xl">
              More than shopping.
              <span className="block text-indigo-600">
                A simpler experience.
              </span>
            </h2>

            <div className="mt-6 space-y-4 text-base leading-8 text-slate-600">
              <p>
                At NovaShop, we bring the world of online shopping closer to
                you. From fashion and jewellery to electronics, our goal is to
                make discovering different products simple and convenient.
              </p>

              <p>
                We believe shopping should feel straightforward. That is why
                NovaShop brings multiple categories together in one place,
                helping you explore available products and find options that
                fit your everyday needs.
              </p>

              <p>
                Our focus is on creating a user-friendly experience with
                convenient browsing, clear product information, and a smooth
                journey from discovery to checkout.
              </p>
            </div>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center gap-2 font-bold text-indigo-700 transition hover:gap-3 hover:text-indigo-900"
            >
              Discover our collection
              <FiArrowRight />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -left-3 -top-3 h-24 w-24 rounded-2xl bg-indigo-200 sm:-left-5 sm:-top-5" />

            <img
              src="https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1000"
              alt="Shopping products arranged for customers"
              width="1000"
              height="667"
              loading="lazy"
              decoding="async"
              className="relative h-[320px] w-full rounded-3xl object-cover shadow-xl sm:h-[430px]"
            />

            <div className="absolute -bottom-5 right-4 max-w-[230px] rounded-2xl border border-slate-200 bg-[#f8faff] p-5 shadow-xl sm:-right-5">
              <p className="text-sm font-medium text-slate-500">
                Our commitment
              </p>
              <p className="mt-1 text-lg font-bold text-blue-950">
                Convenience in every step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shopping Benefits */}
      <section className="bg-[#dfe6f5] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              The NovaShop Experience
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
              Shopping that works for you
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              We focus on the details that make browsing and shopping easier.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className="group rounded-2xl border border-slate-200/80 bg-[#f8faff] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-blue-950/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-blue-950">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="bg-[#e8edfa] px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                Explore our collection
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
                Find your favourites
              </h2>

              <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                Explore our featured shopping categories and discover
                products for different interests and everyday needs.
              </p>
            </div>

            <Link
              to="/products"
              className="inline-flex shrink-0 items-center gap-2 font-bold text-indigo-700 transition hover:gap-3 hover:text-indigo-900"
            >
              View all products
              <FiArrowRight />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => (
              <Link
                key={item.title}
                to="/products"
                aria-label={`Explore ${item.title}`}
                className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f8faff] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-blue-950/10"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    width="800"
                    height="533"
                    loading="lazy"
                    decoding="async"
                    className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#172554]/60 via-transparent to-transparent opacity-70" />

                  <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-xs font-bold text-blue-950 backdrop-blur-sm">
                    Explore category
                  </span>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-blue-950 transition group-hover:text-indigo-700">
                    {item.title}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
                    Explore
                    <FiArrowRight className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#e8edfa] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-10">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-r from-[#172554] via-[#263968] to-[#334780] px-6 py-12 text-center shadow-xl sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-indigo-200">
              <FiShoppingBag />
            </div>

            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your next favourite is waiting.
            </h2>

            <p className="mt-4 leading-7 text-slate-200">
              Take a look around NovaShop and explore the products that match
              your interests.
            </p>

            <Link
              to="/products"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-7 py-3.5 font-bold text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              Start Shopping
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
