import { OrderingExperience } from "@/components/customer/ordering-experience";
import { getPublicMenu } from "@/server/menu/menu-service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const menu = await getPublicMenu();

  return <OrderingExperience initialMenu={menu} />;
}
