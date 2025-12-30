import ReservationWizard from "../components/ReservationWizard";

export default function Home() {
    return(
        <section className="flex justify-center items-center w-screen h-screen bg-[#f7f7f7]">    
            <div>
                <ReservationWizard/>
            </div>
        </section>
    );
}