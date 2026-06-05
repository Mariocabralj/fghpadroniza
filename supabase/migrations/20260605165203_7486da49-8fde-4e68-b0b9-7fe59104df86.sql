CREATE POLICY "Admins delete any document"
ON public.documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));