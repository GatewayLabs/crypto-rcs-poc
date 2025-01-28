"use client";

export default function GameBoard() {
  return (
    <div className="px-6 py-8 max-md:max-w-full font-normal">
      <div className="max-w-full">
        <div className="text-zinc-400 text-sm leading-none max-md:max-w-full">
          Make your move to start the match
        </div>
        <div className="text-white text-5xl font-bold leading-none tracking-[-1.2px] mt-3 max-md:max-w-full max-md:text-[40px]">
          Let&apos;s rock on-chain
        </div>
      </div>
      <div className="flex w-full items-center gap-4 flex-wrap mt-8 max-md:max-w-full group">
        <button className="bg-[rgba(20,9,31,1)] border self-stretch min-h-[356px] flex-1 shrink basis-[0%] my-auto px-8 py-10 rounded-lg border-[rgba(141,12,255,1)] border-solid max-md:px-5 flex flex-col justify-between items-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(141,12,255,0.5)] hover:-translate-y-2 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]">
          <img
            loading="lazy"
            srcSet="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=200 200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=400 400w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=800 800w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true"
            className="aspect-[1.27] object-contain w-[162px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
            alt="Rock"
          />
          <div className="text-[rgba(141,12,255,1)] text-2xl font-normal leading-none text-center uppercase">
            Rock
          </div>
        </button>
        <button className="bg-[rgba(20,9,31,1)] border self-stretch min-h-[356px] flex-1 shrink basis-[0%] my-auto px-8 py-10 rounded-lg border-[rgba(141,12,255,1)] border-solid max-md:px-5 flex flex-col justify-between items-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(141,12,255,0.5)] hover:-translate-y-2 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]">
          <img
            loading="lazy"
            srcSet="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=200 200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=400 400w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=800 800w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true"
            className="aspect-[0.78] object-contain w-[129px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
            alt="Paper"
          />
          <div className="text-[rgba(141,12,255,1)] text-2xl font-normal leading-none text-center uppercase mt-[90px] max-md:mt-10">
            Paper
          </div>
        </button>
        <button className="bg-[rgba(20,9,31,1)] border self-stretch min-h-[356px] flex-1 shrink basis-[0%] my-auto px-8 py-10 rounded-lg border-[rgba(141,12,255,1)] border-solid max-md:px-5 flex flex-col justify-between items-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(141,12,255,0.5)] hover:-translate-y-2 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]">
          <img
            loading="lazy"
            srcSet="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=200 200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=400 400w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=800 800w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=1200 1200w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=1600 1600w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=2000 2000w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true"
            className="aspect-[0.82] object-contain w-[133px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
            alt="Scissors"
          />
          <div className="text-[rgba(141,12,255,1)] text-2xl font-normal leading-none text-center uppercase mt-[90px] max-md:mt-10">
            Scissors
          </div>
        </button>
      </div>
    </div>
  );
}
