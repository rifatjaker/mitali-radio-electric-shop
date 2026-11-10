const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "/api" : `${import.meta.env.BASE_URL}api`);

export async function apiRequest(path, options = {}) {
  let response;
  const { token, shopId, ...requestOptions } = options;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(shopId ? { "X-Shop-Id": String(shopId) } : {}),
        ...requestOptions.headers,
      },
    });
  } catch {
    throw new Error(
      "API সার্ভারে সংযোগ করা যাচ্ছে না। PHP সার্ভার চালু আছে কিনা এবং API URL ঠিক আছে কিনা দেখুন।",
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("সার্ভার থেকে সঠিক উত্তর পাওয়া যায়নি।");
  }

  if (!response.ok || payload.success !== true) {
    throw new Error(payload.message || "অনুরোধটি সম্পন্ন করা যায়নি।");
  }

  return payload;
}
