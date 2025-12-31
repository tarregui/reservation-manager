import ReservationWizard from "../components/ReservationWizard";

export default function Home() {
    return(
        <section className="flex justify-center items-start min-h-screen w-full bg-[#f7f7f7] py-8 px-4 overflow-y-auto">    
            <div className="">
                <ReservationWizard/>
            </div>
        </section>
    );
}