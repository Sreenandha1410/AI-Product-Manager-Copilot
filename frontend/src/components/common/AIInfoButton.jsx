import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

export default function AIInfoButton({
  title = "AI Insights",
  items = [],
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">

      {/* Small AI Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="
          inline-flex
          items-center
          gap-2
          px-3
          py-2
          rounded-lg
          border
          border-primary/20
          bg-primary/5
          text-primary
          text-sm
          font-medium
          hover:bg-primary/10
          transition-colors
        "
      >
        <Sparkles className="h-4 w-4" />
        {title}
      </button>


      {/* AI Popup */}
      {open && (
        <div
          className="
            absolute
            right-0
            top-full
            mt-2
            z-50
            w-[360px]
            max-w-[90vw]
            rounded-xl
            border
            border-border
            bg-background
            shadow-xl
            overflow-hidden
          "
        >

          {/* Header */}
          <div
            className="
              flex
              items-center
              justify-between
              px-4
              py-3
              border-b
              border-border
              bg-primary/5
            "
          >

            <div className="flex items-center gap-2">

              <div
                className="
                  flex
                  items-center
                  justify-center
                  h-7
                  w-7
                  rounded-full
                  bg-primary/10
                  text-primary
                "
              >
                <Sparkles className="h-4 w-4" />
              </div>

              <span className="text-sm font-semibold text-text-primary">
                {title}
              </span>

            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                p-1
                rounded-md
                text-text-secondary
                hover:bg-surface-hover
                hover:text-text-primary
              "
            >
              <X className="h-4 w-4" />
            </button>

          </div>


          {/* Content */}
          <div className="p-4">

            {items.length > 0 ? (
              <ul className="space-y-3">

                {items.map((item, index) => (
                  <li
                    key={index}
                    className="
                      flex
                      items-start
                      gap-2
                      text-sm
                      text-text-secondary
                    "
                  >

                    <span
                      className="
                        mt-2
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-primary
                        shrink-0
                      "
                    />

                    <span className="leading-6">
                      {item}
                    </span>

                  </li>
                ))}

              </ul>
            ) : (
              <p className="text-sm text-text-secondary">
                No AI insights available yet.
              </p>
            )}

          </div>

        </div>
      )}

    </div>
  );
}