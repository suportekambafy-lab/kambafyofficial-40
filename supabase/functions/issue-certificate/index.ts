import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IssueCertificateRequest {
  memberAreaId: string;
  studentEmail: string;
  studentName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { memberAreaId, studentEmail, studentName }: IssueCertificateRequest = await req.json();

    console.log(`Issuing certificate for ${studentEmail} in member area ${memberAreaId}`);

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id")
      .eq("member_area_id", memberAreaId)
      .eq("student_email", studentEmail)
      .single();

    if (existingCert) {
      return new Response(
        JSON.stringify({ success: false, message: "Certificado já emitido para este aluno" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch member area details
    const { data: memberArea, error: maError } = await supabase
      .from("member_areas")
      .select("name")
      .eq("id", memberAreaId)
      .single();

    if (maError || !memberArea) {
      throw new Error("Área de membros não encontrada");
    }

    // Fetch active template
    const { data: template } = await supabase
      .from("certificate_templates")
      .select("id")
      .eq("member_area_id", memberAreaId)
      .eq("is_active", true)
      .single();

    // Calculate total hours from lessons
    const { data: lessons } = await supabase
      .from("lessons")
      .select("duration")
      .eq("member_area_id", memberAreaId)
      .eq("status", "published");

    const totalMinutes = lessons?.reduce((acc, lesson) => acc + (lesson.duration || 0), 0) || 0;
    const totalHours = Math.ceil(totalMinutes / 60);

    // Calculate quiz average score
    const { data: quizResponses } = await supabase
      .from("member_area_quiz_responses")
      .select("score, total_questions")
      .eq("member_area_id", memberAreaId)
      .eq("student_email", studentEmail);

    let quizAverageScore = null;
    if (quizResponses && quizResponses.length > 0) {
      const totalScore = quizResponses.reduce((acc, r) => {
        const percentage = r.total_questions > 0 ? (r.score / r.total_questions) * 100 : 0;
        return acc + percentage;
      }, 0);
      quizAverageScore = Math.round(totalScore / quizResponses.length);
    }

    // Generate certificate number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certificateNumber = `CERT-${timestamp}-${random}`;

    // Issue certificate
    const { data: certificate, error: insertError } = await supabase
      .from("certificates")
      .insert({
        certificate_number: certificateNumber,
        member_area_id: memberAreaId,
        template_id: template?.id || null,
        student_email: studentEmail,
        student_name: studentName,
        course_name: memberArea.name,
        total_hours: totalHours,
        quiz_average_score: quizAverageScore,
        status: "issued",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(`Certificate issued: ${certificateNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        message: "Certificado emitido com sucesso" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error issuing certificate:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
