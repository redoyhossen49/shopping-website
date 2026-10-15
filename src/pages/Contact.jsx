
import React from "react";
import { Link } from "react-router-dom";
import {
  FiMail,
  FiMessageCircle,
  FiMapPin,
  FiArrowRight,
  FiSend,
  FiUser,
} from "react-icons/fi";

const Contact = () => {
  const handleSubmit = (event) => {
    event.preventDefault();

    // The form is UI-only until a backend or email service is connected.
    alert("Thank you for contacting NovaShop! The form is not connected yet.");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#e8edfa] via-[#e3e9f7] to-[#edf0fa] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#172554] via-[#263968] to-[#334780] px-6 py-12 shadow-xl sm:px-10 sm:py-16 lg:px-16">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-indigo-100">
              <FiMessageCircle />
              We'd love to hear from you
            </span>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Let's start a
              <span className="block text-indigo-300">conversation.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Have a question about NovaShop? Send us a message and let us
              know how we can help with your shopping experience.
            </p>
          </div>
        </section>

        {/* Contact Content */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:gap-10">
          {/* Contact Information */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                Get in touch
              </p>

              <h2 className="mt-3 text-2xl font-extrabold text-[#172554] sm:text-3xl">
                We're here to help
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Whether you have a product question or need help navigating
                our store, use the form to get in touch.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-4 rounded-2xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl text-indigo-600">
                  <FiMail />
                </div>

                <div>
                  <h3 className="font-bold text-[#172554]">Email Us</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Use the contact form to send us your message.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl text-indigo-600">
                  <FiUser />
                </div>

                <div>
                  <h3 className="font-bold text-[#172554]">
                    Customer Support
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Tell us about your question so we can better understand
                    your needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl text-indigo-600">
                  <FiMapPin />
                </div>

                <div>
                  <h3 className="font-bold text-[#172554]">NovaShop Online</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Browse our online store anytime.
                  </p>

                  <Link
                    to="/products"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-indigo-700 hover:text-indigo-900"
                  >
                    Explore products <FiArrowRight />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-3xl border border-[#d7dff2] bg-[#f8faff] p-5 shadow-lg shadow-[#172554]/5 sm:p-8 lg:p-10">
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
                Send us a message
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Fill in the details below. All fields are required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-2 block text-sm font-semibold text-[#172554]"
                >
                  Full Name
                </label>

                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  className="w-full rounded-xl border border-[#cbd5e8] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-2 block text-sm font-semibold text-[#172554]"
                >
                  Email Address
                </label>

                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-[#cbd5e8] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-subject"
                  className="mb-2 block text-sm font-semibold text-[#172554]"
                >
                  Subject
                </label>

                <input
                  type="text"
                  id="contact-subject"
                  name="subject"
                  placeholder="What is your message about?"
                  required
                  className="w-full rounded-xl border border-[#cbd5e8] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-2 block text-sm font-semibold text-[#172554]"
                >
                  Your Message
                </label>

                <textarea
                  id="contact-message"
                  name="message"
                  rows={5}
                  placeholder="Tell us how we can help..."
                  required
                  className="w-full resize-y rounded-xl border border-[#cbd5e8] bg-white px-4 py-3 text-sm leading-6 text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-bold text-white shadow-md shadow-indigo-900/10 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg active:translate-y-0"
              >
                Send Message
                <FiSend />
              </button>

              <p className="text-center text-xs leading-5 text-slate-500">
                Thank you for choosing NovaShop. We appreciate your message.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Contact;
